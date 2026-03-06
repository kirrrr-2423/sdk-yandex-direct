import { ensurePositiveInteger } from "../shared/validation.js";
import type { AdsGetResult, SupportedAdAdd, SupportedAdFormatKey, SupportedAdGet, SupportedAdUpdate } from "./types.js";
import { KNOWN_UNSUPPORTED_AD_FORMAT_KEYS, SUPPORTED_AD_FORMAT_KEYS } from "./types.js";
import { UnsupportedAdFormatError } from "./errors.js";

const SUPPORTED_AD_FORMAT_SET = new Set<string>(SUPPORTED_AD_FORMAT_KEYS);
const KNOWN_UNSUPPORTED_AD_FORMAT_SET = new Set<string>(KNOWN_UNSUPPORTED_AD_FORMAT_KEYS);

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function isAdFormatKey(key: string): boolean {
  return key.endsWith("Ad");
}

function pickDeclaredAdFormatKeys(record: Record<string, unknown>): string[] {
  return Object.keys(record).filter((key) => isAdFormatKey(key) && record[key] !== undefined && record[key] !== null);
}

function typeToPayloadKey(typeValue: unknown): string | undefined {
  if (typeValue === "TEXT_AD") {
    return "TextAd";
  }
  if (typeValue === "MOBILE_APP_AD") {
    return "MobileAppAd";
  }
  return undefined;
}

function ensureSupportedPayloadKey(
  record: Record<string, unknown>,
  context: string,
): SupportedAdFormatKey {
  const declaredFormatKeys = pickDeclaredAdFormatKeys(record);
  const knownUnsupported = declaredFormatKeys.find(
    (key) => !SUPPORTED_AD_FORMAT_SET.has(key) && KNOWN_UNSUPPORTED_AD_FORMAT_SET.has(key),
  );
  if (knownUnsupported) {
    throw new UnsupportedAdFormatError({
      reason: "unsupported",
      receivedFormat: knownUnsupported,
      message: `${context} uses unsupported ad format payload key "${knownUnsupported}". Supported keys: ${SUPPORTED_AD_FORMAT_KEYS.join(", ")}.`,
    });
  }

  const unknownUnsupported = declaredFormatKeys.find((key) => !SUPPORTED_AD_FORMAT_SET.has(key));
  if (unknownUnsupported) {
    throw new UnsupportedAdFormatError({
      reason: "unsupported",
      receivedFormat: unknownUnsupported,
      message: `${context} uses unsupported ad format payload key "${unknownUnsupported}". Supported keys: ${SUPPORTED_AD_FORMAT_KEYS.join(", ")}.`,
    });
  }

  const supportedKeys = SUPPORTED_AD_FORMAT_KEYS.filter((key) => record[key] !== undefined && record[key] !== null);
  if (supportedKeys.length > 1) {
    throw new UnsupportedAdFormatError({
      reason: "ambiguous",
      receivedFormat: supportedKeys.join(", "),
      message: `${context} contains multiple ad format payloads (${supportedKeys.join(", ")}). Exactly one format is allowed.`,
    });
  }

  if (supportedKeys.length === 1) {
    return supportedKeys[0];
  }

  const typeFormat = typeToPayloadKey(record.Type);
  if (typeFormat && SUPPORTED_AD_FORMAT_SET.has(typeFormat)) {
    throw new UnsupportedAdFormatError({
      reason: "missing",
      receivedFormat: String(record.Type),
      message: `${context} declares Type="${String(record.Type)}" but is missing payload key "${typeFormat}".`,
    });
  }

  if (typeof record.Type === "string") {
    throw new UnsupportedAdFormatError({
      reason: "unsupported",
      receivedFormat: record.Type,
      message: `${context} uses unsupported Type="${record.Type}". Supported types: TEXT_AD, MOBILE_APP_AD.`,
    });
  }

  throw new UnsupportedAdFormatError({
    reason: "missing",
    message: `${context} must include one supported ad payload key: ${SUPPORTED_AD_FORMAT_KEYS.join(", ")}.`,
  });
}

export function assertSupportedAddAds(value: unknown, name = "Ads.add params.Ads"): asserts value is readonly SupportedAdAdd[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array.`);
  }

  value.forEach((entry, index) => {
    const item = asRecord(entry, `${name}[${index}]`);
    ensurePositiveInteger(item.AdGroupId, `${name}[${index}].AdGroupId`);
    ensureSupportedPayloadKey(item, `${name}[${index}]`);
  });
}

export function assertSupportedUpdateAds(value: unknown, name = "Ads.update params.Ads"): asserts value is readonly SupportedAdUpdate[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array.`);
  }

  value.forEach((entry, index) => {
    const item = asRecord(entry, `${name}[${index}]`);
    ensurePositiveInteger(item.Id, `${name}[${index}].Id`);
    ensureSupportedPayloadKey(item, `${name}[${index}]`);
  });
}

export function ensureAdsGetResult(value: unknown, name = "Ads.get result"): AdsGetResult {
  const record = asRecord(value, name);
  const adsRaw = record.Ads;

  if (!Array.isArray(adsRaw)) {
    throw new TypeError(`${name}.Ads must be an array.`);
  }

  const ads = adsRaw.map((entry, index) => ensureSupportedAdGet(entry, `${name}.Ads[${index}]`));
  const limitedBy = record.LimitedBy;
  if (limitedBy !== undefined && !Number.isInteger(limitedBy)) {
    throw new TypeError(`${name}.LimitedBy must be an integer when present.`);
  }

  return {
    ...record,
    Ads: ads,
    LimitedBy: limitedBy as number | undefined,
  } as AdsGetResult;
}

function ensureSupportedAdGet(value: unknown, name: string): SupportedAdGet {
  const ad = asRecord(value, name);
  ensurePositiveInteger(ad.Id, `${name}.Id`);
  ensureSupportedPayloadKey(ad, name);
  return ad as SupportedAdGet;
}

