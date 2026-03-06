import type {
  JsonRpcRequestEnvelope,
  PaginationPage,
  UnitsUsage,
  YandexDirectId,
  YandexDirectIds,
} from "./contracts.js";

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object.`);
  }
  return value as Record<string, unknown>;
}

export function ensureNonEmptyString(value: unknown, name: string): string {
  if (typeof value !== "string") {
    throw new TypeError(`${name} must be a string.`);
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }

  return normalized;
}

export function ensurePositiveInteger(value: unknown, name: string): number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new TypeError(`${name} must be a positive integer.`);
  }
  return Number(value);
}

export function ensureNonNegativeInteger(value: unknown, name: string): number {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new TypeError(`${name} must be a non-negative integer.`);
  }
  return Number(value);
}

export function ensureIds(value: unknown, name = "Ids"): YandexDirectIds {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array of positive integers.`);
  }

  return value.map((entry, index) => ensurePositiveInteger(entry, `${name}[${index}]`)) as YandexDirectId[];
}

export function ensurePaginationPage(value: unknown, name = "Page"): PaginationPage {
  const record = asRecord(value, name);
  return {
    Limit: ensurePositiveInteger(record.Limit, `${name}.Limit`),
    Offset: record.Offset === undefined
      ? undefined
      : ensureNonNegativeInteger(record.Offset, `${name}.Offset`),
  };
}

export function ensureJsonRpcRequestEnvelope<TMethod extends string = string, TParams = unknown>(
  value: unknown,
): JsonRpcRequestEnvelope<TMethod, TParams> {
  const record = asRecord(value, "request body");
  const method = ensureNonEmptyString(record.method, "request body.method");
  return {
    ...record,
    method,
  } as JsonRpcRequestEnvelope<TMethod, TParams>;
}

function toFiniteNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseUnitsUsageHeader(value: string | null | undefined): UnitsUsage | undefined {
  if (!value) {
    return undefined;
  }

  const [spentRaw, remainingRaw, limitRaw] = value.split("/");
  return {
    raw: value,
    spent: toFiniteNumber(spentRaw),
    remaining: toFiniteNumber(remainingRaw),
    limit: toFiniteNumber(limitRaw),
  };
}
