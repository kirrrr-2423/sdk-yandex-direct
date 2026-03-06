import {
  ApiError,
  TimeoutError,
  TransportError,
  classifyApiError,
  classifyRetryability,
  toTransportError,
} from "./errors.js";
import { sanitizeHeaders, sanitizePayload, toHeaderRecord } from "./hooks.js";
import {
  ensureJsonRpcRequestEnvelope,
  ensureNonEmptyString,
  parseUnitsUsageHeader,
} from "./shared/validation.js";
import type { YandexDirectApiErrorPayload } from "./shared/contracts.js";
import type {
  HeaderMap,
  JsonEnvelope,
  JsonRpcRequestBody,
  ReportHeaders,
  ReportRequestOptions,
  RequestOptions,
  RetryContext,
  RetryPolicy,
  TransportMetadata,
  TransportResponse,
  YandexDirectClientConfig,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.direct.yandex.com";
const DEFAULT_LANGUAGE = "en";
const DEFAULT_TIMEOUT_MS = 15_000;

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 2,
  baseDelayMs: 200,
  maxDelayMs: 1_000,
  backoffFactor: 2,
};

interface ExecuteRequest {
  endpoint: "service" | "reports";
  service?: string;
  url: string;
  body: unknown;
  headers: HeaderMap;
  timeoutMs: number;
  idempotent: boolean;
  metadata?: Record<string, unknown>;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function coerceHeaders(input?: HeaderMap): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input) {
    return out;
  }

  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined) {
      continue;
    }
    out[key] = String(value);
  }

  return out;
}

function parseNumberHeader(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : undefined;
}

function extractMetadata(headers: Headers, status: number): TransportMetadata {
  const headerRecord = toHeaderRecord(headers);
  return {
    status,
    requestId: headers.get("RequestId") ?? undefined,
    units: parseUnitsUsageHeader(headers.get("Units")),
    unitsUsedLogin: headers.get("Units-Used-Login") ?? undefined,
    retryIn: parseNumberHeader(headers.get("retryIn")),
    reportsInQueue: parseNumberHeader(headers.get("reportsInQueue")),
    headers: headerRecord,
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

function defaultShouldRetry(context: RetryContext): boolean {
  if (!context.idempotent || context.attempt >= context.maxAttempts) {
    return false;
  }

  if (context.error instanceof TimeoutError) {
    return true;
  }

  if (context.error instanceof ApiError || context.error instanceof TransportError) {
    return context.error.retryable;
  }

  if (context.response) {
    return classifyRetryability({ status: context.response.status }).retryable;
  }

  if (context.error) {
    return classifyRetryability({ cause: context.error }).retryable;
  }

  return false;
}

function defaultDelayMs(policy: RetryPolicy, attempt: number): number {
  const exp = Math.max(0, attempt - 1);
  const rawDelay = policy.baseDelayMs * Math.pow(policy.backoffFactor, exp);
  return Math.min(policy.maxDelayMs, rawDelay);
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function extractApiError(payload: unknown): YandexDirectApiErrorPayload | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const maybeEnvelope = payload as { error?: unknown };
  if (!maybeEnvelope.error || typeof maybeEnvelope.error !== "object") {
    return undefined;
  }

  const errorPayload = maybeEnvelope.error as YandexDirectApiErrorPayload;
  if (
    errorPayload.error_code === undefined
    && errorPayload.error_string === undefined
    && errorPayload.error_detail === undefined
  ) {
    return undefined;
  }

  return errorPayload;
}

async function parseBody(endpoint: "service" | "reports", response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  const textBody = await response.text();

  if (textBody.length === 0) {
    return {};
  }

  if (endpoint === "reports" && !contentType.includes("application/json")) {
    return textBody;
  }

  try {
    return JSON.parse(textBody) as JsonEnvelope;
  } catch {
    if (endpoint === "reports" || !response.ok) {
      return textBody;
    }
    throw new TransportError("Failed to parse JSON response from Yandex Direct API.", {
      status: response.status,
      retryable: false,
    });
  }
}

function mergeRetryPolicy(retry?: Partial<RetryPolicy>): RetryPolicy {
  const merged: RetryPolicy = {
    ...DEFAULT_RETRY_POLICY,
    ...retry,
  };

  if (merged.maxAttempts < 1) {
    throw new Error("retry.maxAttempts must be at least 1.");
  }

  return merged;
}

export class YandexDirectTransport {
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly language: string;
  private readonly retryPolicy: RetryPolicy;
  private readonly config: YandexDirectClientConfig;

  constructor(config: YandexDirectClientConfig) {
    if (!config.token && !config.tokenProvider) {
      throw new Error("Either `token` or `tokenProvider` must be configured.");
    }

    this.fetchFn = config.fetch ?? fetch;
    this.baseUrl = normalizeBaseUrl(config.baseUrl ?? DEFAULT_BASE_URL);
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.language = config.language ?? DEFAULT_LANGUAGE;
    this.retryPolicy = mergeRetryPolicy(config.retry);
    this.config = config;
  }

  async requestService<T = unknown>(
    service: string,
    body: JsonRpcRequestBody,
    options: RequestOptions = {},
  ): Promise<TransportResponse<JsonEnvelope<T>>> {
    const resolvedService = ensureNonEmptyString(service, "service");
    const envelope = ensureJsonRpcRequestEnvelope(body);

    const request = await this.buildRequest({
      endpoint: "service",
      service: resolvedService,
      body: envelope,
      options,
      url: `${this.baseUrl}/json/v5/${resolvedService}`,
    });

    return this.execute<JsonEnvelope<T>>(request);
  }

  async requestReport<T = unknown>(
    body: unknown,
    options: ReportRequestOptions = {},
  ): Promise<TransportResponse<T>> {
    const request = await this.buildRequest({
      endpoint: "reports",
      body,
      options,
      url: `${this.baseUrl}/json/v5/reports`,
    });

    return this.execute<T>(request);
  }

  private async execute<T>(request: ExecuteRequest): Promise<TransportResponse<T>> {
    const maxAttempts = this.retryPolicy.maxAttempts;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      let timedOut = false;
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, request.timeoutMs);

      const headers = coerceHeaders(request.headers);
      let response: Response | undefined;
      let metadata: TransportMetadata | undefined;

      await this.callHook("onRequest", {
        endpoint: request.endpoint,
        service: request.service,
        url: request.url,
        method: "POST",
        attempt,
        idempotent: request.idempotent,
        headers: sanitizeHeaders(headers),
        body: sanitizePayload(request.body),
        metadata: request.metadata,
      });

      try {
        response = await this.fetchFn(request.url, {
          method: "POST",
          headers,
          body: JSON.stringify(request.body),
          signal: controller.signal,
        });
        metadata = extractMetadata(response.headers, response.status);

        const parsed = await parseBody(request.endpoint, response);
        const apiError = extractApiError(parsed);
        if (apiError) {
          throw classifyApiError(apiError, response.status, metadata, parsed);
        }

        if (!response.ok) {
          throw new TransportError(`HTTP ${response.status} from Yandex Direct API.`, {
            status: response.status,
            metadata,
            rawPayload: parsed,
          });
        }

        await this.callHook("onResponse", {
          endpoint: request.endpoint,
          service: request.service,
          status: response.status,
          body: sanitizePayload(parsed),
          metadata,
        });

        return {
          data: parsed as T,
          metadata,
        };
      } catch (error) {
        let wrappedError: unknown = error;

        if (timedOut || isAbortError(error)) {
          wrappedError = new TimeoutError(`Request timed out after ${request.timeoutMs}ms.`, {
            cause: error,
            metadata,
          });
        } else if (!(error instanceof ApiError) && !(error instanceof TransportError)) {
          wrappedError = toTransportError(error, response?.status, metadata);
        }

        const retryContext: RetryContext = {
          endpoint: request.endpoint,
          service: request.service,
          idempotent: request.idempotent,
          attempt,
          maxAttempts,
          response,
          error: wrappedError,
        };
        const shouldRetry = this.shouldRetry(retryContext);

        const errorForHook = wrappedError instanceof Error
          ? wrappedError
          : new Error("Unknown transport error");

        await this.callHook("onError", {
          endpoint: request.endpoint,
          service: request.service,
          errorName: errorForHook.name,
          errorMessage: errorForHook.message,
          retryable: shouldRetry,
          status: response?.status,
          metadata,
        });

        if (shouldRetry) {
          const retryDelay = this.computeRetryDelay(retryContext);
          await delay(retryDelay);
          continue;
        }

        throw wrappedError;
      } finally {
        clearTimeout(timeoutHandle);
      }
    }

    throw new TransportError("Retry policy exhausted.", { retryable: false });
  }

  private shouldRetry(context: RetryContext): boolean {
    if (!context.idempotent || context.attempt >= context.maxAttempts) {
      return false;
    }

    if (this.retryPolicy.shouldRetry) {
      return this.retryPolicy.shouldRetry(context);
    }

    return defaultShouldRetry(context);
  }

  private computeRetryDelay(context: RetryContext): number {
    if (this.retryPolicy.computeDelayMs) {
      return this.retryPolicy.computeDelayMs(context);
    }

    return defaultDelayMs(this.retryPolicy, context.attempt);
  }

  private async buildRequest(input: {
    endpoint: "service" | "reports";
    service?: string;
    body: unknown;
    options: RequestOptions | ReportRequestOptions;
    url: string;
  }): Promise<ExecuteRequest> {
    const token = await this.resolveToken();
    const clientLogin = input.options.clientLogin ?? this.config.clientLogin;

    const headers: HeaderMap = {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
      "Accept-Language": this.language,
    };

    if (this.config.userAgent) {
      headers["User-Agent"] = this.config.userAgent;
    }

    if (clientLogin) {
      headers["Client-Login"] = clientLogin;
    }

    if (this.config.useOperatorUnits) {
      headers["Use-Operator-Units"] = "true";
    }

    if (input.endpoint === "reports") {
      this.applyReportHeaders(headers, (input.options as ReportRequestOptions).reportHeaders);
    }

    if (this.config.headerProvider) {
      const extraHeaders = await this.config.headerProvider({
        endpoint: input.endpoint,
        service: input.service,
        method: this.extractMethod(input.body),
        clientLogin,
      });
      Object.assign(headers, extraHeaders ?? {});
    }

    Object.assign(headers, input.options.headers ?? {});

    return {
      endpoint: input.endpoint,
      service: input.service,
      url: input.url,
      body: input.body,
      headers,
      timeoutMs: input.options.timeoutMs ?? this.timeoutMs,
      idempotent: input.options.idempotent ?? false,
      metadata: input.options.metadata,
    };
  }

  private applyReportHeaders(headers: HeaderMap, reportHeaders?: ReportHeaders): void {
    if (!reportHeaders) {
      return;
    }

    if (reportHeaders.processingMode) {
      headers.processingMode = reportHeaders.processingMode;
    }
    if (typeof reportHeaders.returnMoneyInMicros === "boolean") {
      headers.returnMoneyInMicros = reportHeaders.returnMoneyInMicros ? "true" : "false";
    }
    if (typeof reportHeaders.skipReportHeader === "boolean") {
      headers.skipReportHeader = reportHeaders.skipReportHeader ? "true" : "false";
    }
    if (typeof reportHeaders.skipColumnHeader === "boolean") {
      headers.skipColumnHeader = reportHeaders.skipColumnHeader ? "true" : "false";
    }
    if (typeof reportHeaders.skipReportSummary === "boolean") {
      headers.skipReportSummary = reportHeaders.skipReportSummary ? "true" : "false";
    }
  }

  private async callHook(
    hookName: keyof NonNullable<YandexDirectClientConfig["hooks"]>,
    payload: unknown,
  ): Promise<void> {
    const hook = this.config.hooks?.[hookName];
    if (!hook) {
      return;
    }

    try {
      await hook(payload as never);
    } catch {
      // Hooks are best-effort observability and must not alter transport behavior.
    }
  }

  private extractMethod(body: unknown): string | undefined {
    if (!body || typeof body !== "object") {
      return undefined;
    }

    const maybeMethod = (body as { method?: unknown }).method;
    return typeof maybeMethod === "string" ? maybeMethod : undefined;
  }

  private async resolveToken(): Promise<string> {
    const token = this.config.tokenProvider
      ? await this.config.tokenProvider()
      : this.config.token;

    if (!token) {
      throw new Error("Resolved empty token. Check `token`/`tokenProvider` configuration.");
    }

    return token;
  }
}
