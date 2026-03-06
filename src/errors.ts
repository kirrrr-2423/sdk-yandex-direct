import type { YandexDirectApiErrorPayload } from "./shared/contracts.js";
import type { TransportMetadata } from "./types.js";

export class SdkError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable = false, cause?: unknown) {
    super(message, cause ? { cause } : undefined);
    this.name = new.target.name;
    this.code = code;
    this.retryable = retryable;
  }
}

export class TransportError extends SdkError {
  readonly status?: number;
  readonly metadata?: TransportMetadata;

  constructor(message: string, options?: {
    status?: number;
    retryable?: boolean;
    metadata?: TransportMetadata;
    cause?: unknown;
  }) {
    super(message, "TRANSPORT_ERROR", options?.retryable ?? false, options?.cause);
    this.status = options?.status;
    this.metadata = options?.metadata;
  }
}

export class TimeoutError extends TransportError {
  constructor(message: string, options?: { metadata?: TransportMetadata; cause?: unknown }) {
    super(message, { retryable: true, cause: options?.cause, metadata: options?.metadata });
    this.name = "TimeoutError";
  }
}

export class ApiError extends SdkError {
  readonly requestId?: string;
  readonly errorCode?: number;
  readonly errorString?: string;
  readonly errorDetail?: string;
  readonly status?: number;
  readonly metadata?: TransportMetadata;

  constructor(message: string, options?: {
    requestId?: string;
    errorCode?: number;
    errorString?: string;
    errorDetail?: string;
    status?: number;
    retryable?: boolean;
    metadata?: TransportMetadata;
  }) {
    super(message, "API_ERROR", options?.retryable ?? false);
    this.requestId = options?.requestId;
    this.errorCode = options?.errorCode;
    this.errorString = options?.errorString;
    this.errorDetail = options?.errorDetail;
    this.status = options?.status;
    this.metadata = options?.metadata;
  }
}

export class AuthError extends ApiError {
  constructor(message: string, options?: ConstructorParameters<typeof ApiError>[1]) {
    super(message, options);
    this.name = "AuthError";
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string, options?: ConstructorParameters<typeof ApiError>[1]) {
    super(message, { ...options, retryable: true });
    this.name = "RateLimitError";
  }
}

const AUTH_CODES = new Set<number>([53, 54, 55, 56, 57, 58]);

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
  return /rate|limit|too many|quota|retry/i.test(value);
}

export function classifyApiError(
  payload: YandexDirectApiErrorPayload,
  status: number,
  metadata?: TransportMetadata,
): ApiError {
  const message = payload.error_string ?? payload.error_detail ?? "Yandex Direct API returned an error.";
  const baseOptions = {
    requestId: payload.request_id ?? metadata?.requestId,
    errorCode: payload.error_code,
    errorString: payload.error_string,
    errorDetail: payload.error_detail,
    status,
    metadata,
  };

  const isAuth = status === 401
    || status === 403
    || (typeof payload.error_code === "number" && AUTH_CODES.has(payload.error_code))
    || looksLikeAuthMessage(payload.error_string)
    || looksLikeAuthMessage(payload.error_detail);
  if (isAuth) {
    return new AuthError(message, baseOptions);
  }

  const isRateLimit = status === 429
    || looksLikeRateLimit(payload.error_string)
    || looksLikeRateLimit(payload.error_detail);
  if (isRateLimit) {
    return new RateLimitError(message, baseOptions);
  }

  return new ApiError(message, {
    ...baseOptions,
    retryable: status >= 500,
  });
}

export function toTransportError(
  error: unknown,
  status?: number,
  metadata?: TransportMetadata,
): TransportError {
  if (error instanceof TransportError) {
    return error;
  }

  if (error instanceof Error) {
    return new TransportError(error.message, {
      status,
      metadata,
      cause: error,
      retryable: status !== undefined ? status >= 500 || status === 429 : true,
    });
  }

  return new TransportError("Transport failure", {
    status,
    metadata,
    cause: error,
    retryable: status !== undefined ? status >= 500 || status === 429 : true,
  });
}
