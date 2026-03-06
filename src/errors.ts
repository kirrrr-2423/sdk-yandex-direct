import type { TransportMetadata, YandexDirectApiErrorPayload } from "./types.js";

const AUTH_CODES = new Set<number>([53, 54, 55, 56, 57, 58]);
const TRANSIENT_HTTP_STATUSES = new Set<number>([408, 425, 429, 500, 502, 503, 504]);
const TRANSIENT_NETWORK_CODES = new Set<string>([
  "ECONNABORTED",
  "ECONNRESET",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "EPIPE",
  "ENETDOWN",
  "ENETUNREACH",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);
const SENSITIVE_NAME_PATTERN = /(authorization|token|secret|api[-_]?key|password|cookie)/i;
const BEARER_TOKEN_PATTERN = /(Bearer\s+)([A-Za-z0-9._~+/=-]+)/gi;
const QUERY_SECRET_PATTERN = /([?&](?:access_token|token|api_key|apikey|secret|password)=)[^&\s]+/gi;

export type RetryabilityReason =
  | "auth"
  | "rate_limit"
  | "timeout"
  | "network_transient"
  | "http_transient"
  | "api_transient"
  | "not_retryable";

export interface RetryabilityInput {
  status?: number;
  errorCode?: number;
  errorString?: string;
  errorDetail?: string;
  networkCode?: string;
  cause?: unknown;
}

export interface RetryabilityResult {
  retryable: boolean;
  reason: RetryabilityReason;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function sanitizeDebugString(input: string): string {
  return input
    .replace(BEARER_TOKEN_PATTERN, "$1<redacted>")
    .replace(QUERY_SECRET_PATTERN, "$1<redacted>");
}

function sanitizeDebugValue(value: unknown, parentKey?: string): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (parentKey && SENSITIVE_NAME_PATTERN.test(parentKey)) {
    return "<redacted>";
  }

  if (typeof value === "string") {
    return sanitizeDebugString(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeDebugValue(entry));
  }

  if (!isRecord(value)) {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    sanitized[key] = sanitizeDebugValue(entry, key);
  }

  return sanitized;
}

function toStringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function extractNetworkCode(cause: unknown): string | undefined {
  if (!isRecord(cause)) {
    return undefined;
  }

  const code = toStringValue(cause.code);
  return code ?? toStringValue(cause.errno);
}

function looksLikeAuthMessage(value?: string): boolean {
  if (!value) {
    return false;
  }
  return /auth|authorization|token|forbidden|unauthorized/i.test(value);
}

function looksLikeRateLimit(value?: string): boolean {
  if (!value) {
    return false;
  }
  return /rate|limit|too many|quota/i.test(value);
}

function looksLikeTransientMessage(value?: string): boolean {
  if (!value) {
    return false;
  }
  return /temporar|try again|retry|timeout|unavailable|overload|internal/i.test(value);
}

/**
 * Deterministic retryability classifier used by transport and API error mapping.
 */
export function classifyRetryability(input: RetryabilityInput): RetryabilityResult {
  const networkCode = input.networkCode ?? extractNetworkCode(input.cause);
  const normalizedCode = networkCode?.toUpperCase();

  if (
    input.status === 401
    || input.status === 403
    || (typeof input.errorCode === "number" && AUTH_CODES.has(input.errorCode))
    || looksLikeAuthMessage(input.errorString)
    || looksLikeAuthMessage(input.errorDetail)
  ) {
    return { retryable: false, reason: "auth" };
  }

  if (
    input.status === 429
    || looksLikeRateLimit(input.errorString)
    || looksLikeRateLimit(input.errorDetail)
  ) {
    return { retryable: true, reason: "rate_limit" };
  }

  if (normalizedCode && TRANSIENT_NETWORK_CODES.has(normalizedCode)) {
    return { retryable: true, reason: "network_transient" };
  }

  if (input.status !== undefined && TRANSIENT_HTTP_STATUSES.has(input.status)) {
    return { retryable: true, reason: "http_transient" };
  }

  if (looksLikeTransientMessage(input.errorString) || looksLikeTransientMessage(input.errorDetail)) {
    return { retryable: true, reason: "api_transient" };
  }

  if (normalizedCode === "ABORT_ERR" || normalizedCode === "ETIMEDOUT") {
    return { retryable: true, reason: "timeout" };
  }

  return { retryable: false, reason: "not_retryable" };
}

export class SdkError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryReason: RetryabilityReason;

  constructor(message: string, options: {
    code: string;
    retryable?: boolean;
    retryReason?: RetryabilityReason;
    cause?: unknown;
  }) {
    super(sanitizeDebugString(message), options.cause ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryReason = options.retryReason ?? "not_retryable";
  }
}

export interface TransportErrorOptions {
  status?: number;
  retryable?: boolean;
  retryReason?: RetryabilityReason;
  metadata?: TransportMetadata;
  cause?: unknown;
  networkCode?: string;
  rawPayload?: unknown;
  code?: string;
}

/**
 * Base class for HTTP/network/serialization transport failures.
 */
export class TransportError extends SdkError {
  readonly status?: number;
  readonly metadata?: TransportMetadata;
  readonly requestId?: string;
  readonly units?: TransportMetadata["units"];
  readonly networkCode?: string;
  readonly rawPayload?: unknown;

  constructor(message: string, options: TransportErrorOptions = {}) {
    const classification = classifyRetryability({
      status: options.status,
      networkCode: options.networkCode,
      cause: options.cause,
    });
    super(message, {
      code: options.code ?? "TRANSPORT_ERROR",
      retryable: options.retryable ?? classification.retryable,
      retryReason: options.retryReason ?? classification.reason,
      cause: options.cause,
    });
    this.status = options.status;
    this.metadata = options.metadata;
    this.requestId = options.metadata?.requestId;
    this.units = options.metadata?.units;
    this.networkCode = options.networkCode ?? extractNetworkCode(options.cause);
    this.rawPayload = sanitizeDebugValue(options.rawPayload);
  }
}

/**
 * Request timeout mapped from abort signal/AbortError.
 */
export class TimeoutError extends TransportError {
  constructor(message: string, options?: { metadata?: TransportMetadata; cause?: unknown }) {
    super(message, {
      code: "TIMEOUT_ERROR",
      retryable: true,
      retryReason: "timeout",
      cause: options?.cause,
      metadata: options?.metadata,
      networkCode: "ABORT_ERR",
    });
    this.name = "TimeoutError";
  }
}

export interface ApiErrorOptions {
  requestId?: string;
  errorCode?: number;
  errorString?: string;
  errorDetail?: string;
  status?: number;
  retryable?: boolean;
  retryReason?: RetryabilityReason;
  metadata?: TransportMetadata;
  rawPayload?: unknown;
  cause?: unknown;
  code?: string;
}

/**
 * Base class for Yandex Direct API envelope errors.
 */
export class ApiError extends SdkError {
  readonly requestId?: string;
  readonly errorCode?: number;
  readonly errorString?: string;
  readonly errorDetail?: string;
  readonly status?: number;
  readonly metadata?: TransportMetadata;
  readonly units?: TransportMetadata["units"];
  readonly rawPayload?: unknown;

  constructor(message: string, options: ApiErrorOptions = {}) {
    const classification = classifyRetryability({
      status: options.status,
      errorCode: options.errorCode,
      errorString: options.errorString,
      errorDetail: options.errorDetail,
      cause: options.cause,
    });
    super(message, {
      code: options.code ?? "API_ERROR",
      retryable: options.retryable ?? classification.retryable,
      retryReason: options.retryReason ?? classification.reason,
      cause: options.cause,
    });
    this.requestId = options.requestId;
    this.errorCode = options.errorCode;
    this.errorString = options.errorString ? sanitizeDebugString(options.errorString) : undefined;
    this.errorDetail = options.errorDetail ? sanitizeDebugString(options.errorDetail) : undefined;
    this.status = options.status;
    this.metadata = options.metadata;
    this.units = options.metadata?.units;
    this.rawPayload = sanitizeDebugValue(options.rawPayload);
  }
}

/**
 * API business error that is neither auth nor rate-limit.
 */
export class ApiBusinessError extends ApiError {
  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message, {
      ...options,
      code: options.code ?? "API_BUSINESS_ERROR",
    });
    this.name = "ApiBusinessError";
  }
}

/**
 * Authentication/authorization envelope error.
 */
export class AuthError extends ApiError {
  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message, {
      ...options,
      code: options.code ?? "AUTH_ERROR",
      retryable: false,
      retryReason: "auth",
    });
    this.name = "AuthError";
  }
}

/**
 * Rate-limit/quota envelope error. Always retryable.
 */
export class RateLimitError extends ApiError {
  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message, {
      ...options,
      code: options.code ?? "RATE_LIMIT_ERROR",
      retryable: true,
      retryReason: "rate_limit",
    });
    this.name = "RateLimitError";
  }
}

export function classifyApiError(
  payload: YandexDirectApiErrorPayload,
  status: number,
  metadata?: TransportMetadata,
  rawPayload?: unknown,
): ApiError {
  const message = payload.error_string ?? payload.error_detail ?? "Yandex Direct API returned an error.";
  const baseOptions = {
    requestId: payload.request_id ?? metadata?.requestId,
    errorCode: payload.error_code,
    errorString: payload.error_string,
    errorDetail: payload.error_detail,
    status,
    metadata,
    rawPayload: rawPayload ?? payload,
  };

  const retryability = classifyRetryability({
    status,
    errorCode: payload.error_code,
    errorString: payload.error_string,
    errorDetail: payload.error_detail,
  });

  if (retryability.reason === "auth") {
    return new AuthError(message, baseOptions);
  }

  if (retryability.reason === "rate_limit") {
    return new RateLimitError(message, baseOptions);
  }

  return new ApiBusinessError(message, {
    ...baseOptions,
    retryable: retryability.retryable,
    retryReason: retryability.reason,
  });
}

export function toTransportError(
  error: unknown,
  status?: number,
  metadata?: TransportMetadata,
  rawPayload?: unknown,
): TransportError {
  if (error instanceof TransportError) {
    return error;
  }

  const classification = classifyRetryability({ status, cause: error });
  if (error instanceof Error) {
    return new TransportError(error.message, {
      status,
      metadata,
      cause: error,
      retryable: classification.retryable,
      retryReason: classification.reason,
      networkCode: extractNetworkCode(error),
      rawPayload,
    });
  }

  return new TransportError("Transport failure", {
    status,
    metadata,
    cause: error,
    retryable: classification.retryable,
    retryReason: classification.reason,
    rawPayload,
  });
}
