import {
  ensureIds,
  ensureNonEmptyString,
  ensurePaginationPage,
  ensurePositiveInteger,
} from "../shared/validation.js";
import { YandexDirectTransport } from "../transport.js";
import type { JsonEnvelope, RequestOptions, TransportResponse } from "../types.js";
import type {
  BidModifierAddItem,
  BidModifierSetItem,
  BidModifiersAddRequest,
  BidModifiersAddResult,
  BidModifiersDeleteRequest,
  BidModifiersDeleteResult,
  BidModifiersGetRequest,
  BidModifiersGetResult,
  BidModifiersSelectionCriteria,
  BidModifiersSetRequest,
  BidModifiersSetResult,
} from "../models/bidmodifiers.js";

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

function ensureSelectionCriteria(value: unknown): BidModifiersSelectionCriteria {
  const record = asRecord(value, "params.SelectionCriteria");
  const ids = record.Ids === undefined ? undefined : ensureIds(record.Ids, "params.SelectionCriteria.Ids");
  const campaignIds = record.CampaignIds === undefined ? undefined : ensureIds(record.CampaignIds, "params.SelectionCriteria.CampaignIds");
  const adGroupIds = record.AdGroupIds === undefined ? undefined : ensureIds(record.AdGroupIds, "params.SelectionCriteria.AdGroupIds");

  if (!ids?.length && !campaignIds?.length && !adGroupIds?.length) {
    throw new TypeError("params.SelectionCriteria must include at least one of Ids, CampaignIds, or AdGroupIds.");
  }

  return {
    Ids: ids,
    CampaignIds: campaignIds,
    AdGroupIds: adGroupIds,
    Levels: record.Levels === undefined ? undefined : ensureStringArray(record.Levels, "params.SelectionCriteria.Levels"),
    Types: record.Types === undefined ? undefined : ensureStringArray(record.Types, "params.SelectionCriteria.Types"),
  };
}

function ensureGetRequest(value: unknown): BidModifiersGetRequest {
  const record = asRecord(value, "params");
  return {
    SelectionCriteria: ensureSelectionCriteria(record.SelectionCriteria),
    FieldNames: ensureStringArray(record.FieldNames, "params.FieldNames"),
    Page: record.Page === undefined ? undefined : ensurePaginationPage(record.Page, "params.Page"),
  };
}

function ensureAddItem(value: unknown, name: string): BidModifierAddItem {
  const record = asRecord(value, name);
  const hasTarget = record.CampaignId !== undefined || record.AdGroupId !== undefined;
  if (!hasTarget) {
    throw new TypeError(`${name} must include CampaignId or AdGroupId.`);
  }
  if (record.CampaignId !== undefined) {
    ensurePositiveInteger(record.CampaignId, `${name}.CampaignId`);
  }
  if (record.AdGroupId !== undefined) {
    ensurePositiveInteger(record.AdGroupId, `${name}.AdGroupId`);
  }

  return record as BidModifierAddItem;
}

function ensureAddRequest(value: unknown): BidModifiersAddRequest {
  const record = asRecord(value, "params");
  if (!Array.isArray(record.BidModifiers) || record.BidModifiers.length === 0) {
    throw new TypeError("params.BidModifiers must be a non-empty array.");
  }

  return {
    BidModifiers: record.BidModifiers.map((entry, index) => ensureAddItem(entry, `params.BidModifiers[${index}]`)),
  };
}

function ensureSetItem(value: unknown, name: string): BidModifierSetItem {
  const record = asRecord(value, name);
  const hasTarget = record.BidModifierId !== undefined || record.CampaignId !== undefined || record.AdGroupId !== undefined;
  if (!hasTarget) {
    throw new TypeError(`${name} must include BidModifierId, CampaignId, or AdGroupId.`);
  }
  if (record.BidModifierId !== undefined) {
    ensurePositiveInteger(record.BidModifierId, `${name}.BidModifierId`);
  }
  if (record.CampaignId !== undefined) {
    ensurePositiveInteger(record.CampaignId, `${name}.CampaignId`);
  }
  if (record.AdGroupId !== undefined) {
    ensurePositiveInteger(record.AdGroupId, `${name}.AdGroupId`);
  }

  return record as BidModifierSetItem;
}

function ensureSetRequest(value: unknown): BidModifiersSetRequest {
  const record = asRecord(value, "params");
  if (!Array.isArray(record.BidModifiers) || record.BidModifiers.length === 0) {
    throw new TypeError("params.BidModifiers must be a non-empty array.");
  }

  return {
    BidModifiers: record.BidModifiers.map((entry, index) => ensureSetItem(entry, `params.BidModifiers[${index}]`)),
  };
}

function ensureDeleteRequest(value: unknown): BidModifiersDeleteRequest {
  const record = asRecord(value, "params");
  const selection = asRecord(record.SelectionCriteria, "params.SelectionCriteria");
  const ids = ensureIds(selection.Ids, "params.SelectionCriteria.Ids");

  if (ids.length === 0) {
    throw new TypeError("params.SelectionCriteria.Ids must include at least one id.");
  }

  return {
    SelectionCriteria: { Ids: ids },
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

export class BidModifiersService {
  constructor(private readonly transport: YandexDirectTransport) {}

  async get(
    params: BidModifiersGetRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<BidModifiersGetResult>>> {
    const validated = ensureGetRequest(params);
    return this.transport.requestService<BidModifiersGetResult>(
      "bidmodifiers",
      { method: "get", params: validated },
      applyIdempotency(options, true),
    );
  }

  async add(
    params: BidModifiersAddRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<BidModifiersAddResult>>> {
    const validated = ensureAddRequest(params);
    return this.transport.requestService<BidModifiersAddResult>(
      "bidmodifiers",
      { method: "add", params: validated },
      applyIdempotency(options, false),
    );
  }

  async set(
    params: BidModifiersSetRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<BidModifiersSetResult>>> {
    const validated = ensureSetRequest(params);
    return this.transport.requestService<BidModifiersSetResult>(
      "bidmodifiers",
      { method: "set", params: validated },
      applyIdempotency(options, false),
    );
  }

  async delete(
    params: BidModifiersDeleteRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<BidModifiersDeleteResult>>> {
    const validated = ensureDeleteRequest(params);
    return this.transport.requestService<BidModifiersDeleteResult>(
      "bidmodifiers",
      { method: "delete", params: validated },
      applyIdempotency(options, true),
    );
  }
}
