import type { HeaderMap } from "./types.js";

const SENSITIVE_NAME_PATTERN = /(authorization|token|secret|api[-_]?key|password|cookie)/i;

function isSensitiveName(name: string): boolean {
  return SENSITIVE_NAME_PATTERN.test(name);
}

export function toHeaderRecord(input?: Headers | HeaderMap): Record<string, string> {
  const output: Record<string, string> = {};
  if (!input) {
    return output;
  }

  if (input instanceof Headers) {
    for (const [key, value] of input.entries()) {
      output[key] = value;
    }
    return output;
  }

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) {
      continue;
    }
    output[key] = String(value);
  }

  return output;
}

export function sanitizeHeaders(input?: Headers | HeaderMap): Record<string, string> {
  const headers = toHeaderRecord(input);
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    sanitized[key] = isSensitiveName(key) ? "<redacted>" : value;
  }

  return sanitized;
}

export function sanitizePayload(value: unknown, parentKey?: string): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (parentKey && isSensitiveName(parentKey)) {
    return "<redacted>";
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizePayload(entry));
  }

  if (typeof value !== "object") {
    return value;
  }

  const obj = value as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};
  for (const [key, entryValue] of Object.entries(obj)) {
    sanitized[key] = sanitizePayload(entryValue, key);
  }
  return sanitized;
}
