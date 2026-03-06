import type {
  JsonRpcRequestEnvelope,
  JsonRpcResponseEnvelope,
  UnitsUsage,
} from "./shared/contracts.js";

export type HeaderValue = string | number | boolean | null | undefined;
export type HeaderMap = Record<string, HeaderValue>;

export type TokenProvider = () => string | Promise<string>;

export interface HeaderProviderContext {
  endpoint: "service" | "reports";
  service?: string;
  method?: string;
  clientLogin?: string;
}

export type HeaderProvider = (
  context: HeaderProviderContext,
) => HeaderMap | void | Promise<HeaderMap | void>;

export interface RetryContext {
  endpoint: "service" | "reports";
  idempotent: boolean;
  attempt: number;
  maxAttempts: number;
  service?: string;
  response?: Response;
  error?: unknown;
}

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  shouldRetry?: (context: RetryContext) => boolean;
  computeDelayMs?: (context: RetryContext) => number;
}

export interface RequestMetadata {
  [key: string]: unknown;
}

export interface SafeRequestHookEvent {
  endpoint: "service" | "reports";
  service?: string;
  url: string;
  method: string;
  attempt: number;
  idempotent: boolean;
  headers: Record<string, string>;
  body: unknown;
  metadata?: RequestMetadata;
}

export interface TransportMetadata {
  status: number;
  requestId?: string;
  units?: UnitsUsage;
  unitsUsedLogin?: string;
  retryIn?: number;
  reportsInQueue?: number;
  reportState?: ReportExecutionState;
  polling?: ReportPollingHints;
  headers: Record<string, string>;
}

export interface SafeResponseHookEvent {
  endpoint: "service" | "reports";
  service?: string;
  status: number;
  body: unknown;
  metadata: TransportMetadata;
}

export interface SafeErrorHookEvent {
  endpoint: "service" | "reports";
  service?: string;
  errorName: string;
  errorMessage: string;
  retryable: boolean;
  status?: number;
  metadata?: TransportMetadata;
}

export interface TransportHooks {
  onRequest?: (event: SafeRequestHookEvent) => void | Promise<void>;
  onResponse?: (event: SafeResponseHookEvent) => void | Promise<void>;
  onError?: (event: SafeErrorHookEvent) => void | Promise<void>;
}

export interface YandexDirectClientConfig {
  token?: string;
  tokenProvider?: TokenProvider;
  baseUrl?: string;
  language?: string;
  clientLogin?: string;
  useOperatorUnits?: boolean;
  timeoutMs?: number;
  retry?: Partial<RetryPolicy>;
  fetch?: typeof fetch;
  headerProvider?: HeaderProvider;
  hooks?: TransportHooks;
  userAgent?: string;
}

export interface RequestOptions {
  timeoutMs?: number;
  idempotent?: boolean;
  clientLogin?: string;
  headers?: HeaderMap;
  metadata?: RequestMetadata;
}

export type ReportExecutionState = "completed" | "queued" | "in-progress";

export interface ReportPollingHints {
  shouldPoll: boolean;
  retryInSeconds?: number;
  reportsInQueue?: number;
}

export type ReportProcessingMode = "auto" | "online" | "offline";

/**
 * Reports endpoint specific header options for `/json/v5/reports`.
 * See Yandex Direct reports headers docs for details.
 */
export interface ReportHeaders {
  processingMode?: ReportProcessingMode;
  returnMoneyInMicros?: boolean;
  skipReportHeader?: boolean;
  skipColumnHeader?: boolean;
  skipReportSummary?: boolean;
  acceptEncoding?: string;
}

export interface ReportRequestOptions extends RequestOptions {
  reportHeaders?: ReportHeaders;
}

export type JsonRpcRequestBody = JsonRpcRequestEnvelope;
export type JsonEnvelope<T = unknown> = JsonRpcResponseEnvelope<T>;

export interface TransportResponse<T = unknown> {
  data: T;
  metadata: TransportMetadata;
}
