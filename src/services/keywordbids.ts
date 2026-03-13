import {
  ensureIds,
  ensureNonEmptyString,
  ensurePaginationPage,
  ensurePositiveInteger,
} from "../shared/validation.js";
import { YandexDirectTransport } from "../transport.js";
import type { JsonEnvelope, RequestOptions, TransportResponse } from "../types.js";
import type {
  KeywordBidSetAutoItem,
  KeywordBidSetItem,
  KeywordBidsGetRequest,
  KeywordBidsGetResult,
  KeywordBidsSelectionCriteria,
  KeywordBidsSetAutoRequest,
  KeywordBidsSetAutoResult,
  KeywordBidsSetRequest,
  KeywordBidsSetResult,
} from "../models/keywordbids.js";

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function ensureStringArray(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${name} must be a non-empty array of strings.`);
  }

  return value.map((entry, index) => ensureNonEmptyString(entry, `${name}[${index}]`));
}

function ensureSelectionCriteria(value: unknown): KeywordBidsSelectionCriteria {
  const record = asRecord(value, "params.SelectionCriteria");
  const keywordIds = record.KeywordIds === undefined ? undefined : ensureIds(record.KeywordIds, "params.SelectionCriteria.KeywordIds");
  const adGroupIds = record.AdGroupIds === undefined ? undefined : ensureIds(record.AdGroupIds, "params.SelectionCriteria.AdGroupIds");
  const campaignIds = record.CampaignIds === undefined ? undefined : ensureIds(record.CampaignIds, "params.SelectionCriteria.CampaignIds");

  if (!keywordIds?.length && !adGroupIds?.length && !campaignIds?.length) {
    throw new TypeError("params.SelectionCriteria must include at least one of KeywordIds, AdGroupIds, or CampaignIds.");
  }

  return {
    KeywordIds: keywordIds,
    AdGroupIds: adGroupIds,
    CampaignIds: campaignIds,
  };
}

function ensureGetRequest(value: unknown): KeywordBidsGetRequest {
  const record = asRecord(value, "params");
  return {
    SelectionCriteria: ensureSelectionCriteria(record.SelectionCriteria),
    FieldNames: ensureStringArray(record.FieldNames, "params.FieldNames"),
    Page: record.Page === undefined ? undefined : ensurePaginationPage(record.Page, "params.Page"),
  };
}

function ensureSetItem(value: unknown, name: string): KeywordBidSetItem {
  const record = asRecord(value, name);
  const hasEntitySelector = record.KeywordId !== undefined || record.AdGroupId !== undefined || record.CampaignId !== undefined;
  if (!hasEntitySelector) {
    throw new TypeError(`${name} must include one of KeywordId, AdGroupId, or CampaignId.`);
  }
  if (record.KeywordId !== undefined) {
    ensurePositiveInteger(record.KeywordId, `${name}.KeywordId`);
  }
  if (record.AdGroupId !== undefined) {
    ensurePositiveInteger(record.AdGroupId, `${name}.AdGroupId`);
  }
  if (record.CampaignId !== undefined) {
    ensurePositiveInteger(record.CampaignId, `${name}.CampaignId`);
  }
  if (record.SearchBid === undefined && record.ContextBid === undefined && record.StrategyPriority === undefined) {
    throw new TypeError(`${name} must include at least one bid field.`);
  }

  return record as KeywordBidSetItem;
}

function ensureSetRequest(value: unknown): KeywordBidsSetRequest {
  const record = asRecord(value, "params");
  if (!Array.isArray(record.KeywordBids) || record.KeywordBids.length === 0) {
    throw new TypeError("params.KeywordBids must be a non-empty array.");
  }

  return {
    KeywordBids: record.KeywordBids.map((entry, index) => ensureSetItem(entry, `params.KeywordBids[${index}]`)),
  };
}

function ensureSetAutoItem(value: unknown, name: string): KeywordBidSetAutoItem {
  const record = asRecord(value, name);
  const hasEntitySelector = record.AdGroupId !== undefined || record.CampaignId !== undefined;
  if (!hasEntitySelector) {
    throw new TypeError(`${name} must include AdGroupId or CampaignId.`);
  }
  if (record.AdGroupId !== undefined) {
    ensurePositiveInteger(record.AdGroupId, `${name}.AdGroupId`);
  }
  if (record.CampaignId !== undefined) {
    ensurePositiveInteger(record.CampaignId, `${name}.CampaignId`);
  }

  return {
    ...record,
    Value: ensurePositiveInteger(record.Value, `${name}.Value`),
  } as KeywordBidSetAutoItem;
}

function ensureSetAutoRequest(value: unknown): KeywordBidsSetAutoRequest {
  const record = asRecord(value, "params");
  if (!Array.isArray(record.KeywordBids) || record.KeywordBids.length === 0) {
    throw new TypeError("params.KeywordBids must be a non-empty array.");
  }

  return {
    KeywordBids: record.KeywordBids.map((entry, index) => ensureSetAutoItem(entry, `params.KeywordBids[${index}]`)),
  };
}

function applyIdempotency(options: RequestOptions | undefined, idempotent: boolean): RequestOptions {
  if (options?.idempotent !== undefined) {
    return options;
  }

  return {
    ...(options ?? {}),
    idempotent,
  };
}

export class KeywordBidsService {
  constructor(private readonly transport: YandexDirectTransport) {}

  async get(
    params: KeywordBidsGetRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<KeywordBidsGetResult>>> {
    const validated = ensureGetRequest(params);
    return this.transport.requestService<KeywordBidsGetResult>(
      "keywordbids",
      { method: "get", params: validated },
      applyIdempotency(options, true),
    );
  }

  async set(
    params: KeywordBidsSetRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<KeywordBidsSetResult>>> {
    const validated = ensureSetRequest(params);
    return this.transport.requestService<KeywordBidsSetResult>(
      "keywordbids",
      { method: "set", params: validated },
      applyIdempotency(options, false),
    );
  }

  async setAuto(
    params: KeywordBidsSetAutoRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<KeywordBidsSetAutoResult>>> {
    const validated = ensureSetAutoRequest(params);
    return this.transport.requestService<KeywordBidsSetAutoResult>(
      "keywordbids",
      { method: "setAuto", params: validated },
      applyIdempotency(options, false),
    );
  }
}
