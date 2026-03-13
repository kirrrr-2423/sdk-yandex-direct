import {
  ensureIds,
  ensureNonEmptyString,
  ensurePaginationPage,
  ensurePositiveInteger,
} from "../shared/validation.js";
import { YandexDirectTransport } from "../transport.js";
import type { JsonEnvelope, RequestOptions, TransportResponse } from "../types.js";
import type {
  KeywordAddItem,
  KeywordUpdateItem,
  KeywordsAddRequest,
  KeywordsAddResult,
  KeywordsDeleteRequest,
  KeywordsDeleteResult,
  KeywordsGetRequest,
  KeywordsGetResult,
  KeywordsResumeResult,
  KeywordsSelectionCriteria,
  KeywordsStateRequest,
  KeywordsSuspendResult,
  KeywordsUpdateRequest,
  KeywordsUpdateResult,
} from "../models/keywords.js";

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

function ensureSelectionCriteria(value: unknown): KeywordsSelectionCriteria {
  const record = asRecord(value, "params.SelectionCriteria");
  const ids = record.Ids === undefined ? undefined : ensureIds(record.Ids, "params.SelectionCriteria.Ids");
  const adGroupIds = record.AdGroupIds === undefined
    ? undefined
    : ensureIds(record.AdGroupIds, "params.SelectionCriteria.AdGroupIds");
  const campaignIds = record.CampaignIds === undefined
    ? undefined
    : ensureIds(record.CampaignIds, "params.SelectionCriteria.CampaignIds");

  if (!ids?.length && !adGroupIds?.length && !campaignIds?.length) {
    throw new TypeError("params.SelectionCriteria must include at least one of Ids, AdGroupIds, or CampaignIds.");
  }

  return {
    ...record,
    Ids: ids,
    AdGroupIds: adGroupIds,
    CampaignIds: campaignIds,
    States: record.States === undefined ? undefined : ensureStringArray(record.States, "params.SelectionCriteria.States"),
  };
}

function ensureGetRequest(value: unknown): KeywordsGetRequest {
  const record = asRecord(value, "params");
  return {
    SelectionCriteria: ensureSelectionCriteria(record.SelectionCriteria),
    FieldNames: ensureStringArray(record.FieldNames, "params.FieldNames"),
    Page: record.Page === undefined ? undefined : ensurePaginationPage(record.Page, "params.Page"),
  };
}

function ensureAddItem(value: unknown, name: string): KeywordAddItem {
  const record = asRecord(value, name);
  return {
    ...record,
    Keyword: ensureNonEmptyString(record.Keyword, `${name}.Keyword`),
    AdGroupId: ensurePositiveInteger(record.AdGroupId, `${name}.AdGroupId`),
  };
}

function ensureAddRequest(value: unknown): KeywordsAddRequest {
  const record = asRecord(value, "params");
  if (!Array.isArray(record.Keywords) || record.Keywords.length === 0) {
    throw new TypeError("params.Keywords must be a non-empty array.");
  }

  return {
    Keywords: record.Keywords.map((entry, index) => ensureAddItem(entry, `params.Keywords[${index}]`)),
  };
}

function ensureUpdateItem(value: unknown, name: string): KeywordUpdateItem {
  const record = asRecord(value, name);
  const hasChanges = Object.entries(record).some(([key, entryValue]) => key !== "Id" && entryValue !== undefined);
  if (!hasChanges) {
    throw new TypeError(`${name} must contain at least one field to update besides Id.`);
  }

  return {
    ...record,
    Id: ensurePositiveInteger(record.Id, `${name}.Id`),
    Keyword: record.Keyword === undefined ? undefined : ensureNonEmptyString(record.Keyword, `${name}.Keyword`),
  };
}

function ensureUpdateRequest(value: unknown): KeywordsUpdateRequest {
  const record = asRecord(value, "params");
  if (!Array.isArray(record.Keywords) || record.Keywords.length === 0) {
    throw new TypeError("params.Keywords must be a non-empty array.");
  }

  return {
    Keywords: record.Keywords.map((entry, index) => ensureUpdateItem(entry, `params.Keywords[${index}]`)),
  };
}

function ensureStateRequest(value: unknown): KeywordsStateRequest {
  const record = asRecord(value, "params");
  const selection = asRecord(record.SelectionCriteria, "params.SelectionCriteria");
  const ids = ensureIds(selection.Ids, "params.SelectionCriteria.Ids");

  if (ids.length === 0) {
    throw new TypeError("params.SelectionCriteria.Ids must include at least one id.");
  }

  return {
    SelectionCriteria: {
      Ids: ids,
    },
  };
}

function ensureDeleteRequest(value: unknown): KeywordsDeleteRequest {
  return ensureStateRequest(value);
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

export class KeywordsService {
  constructor(private readonly transport: YandexDirectTransport) {}

  async get(
    params: KeywordsGetRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<KeywordsGetResult>>> {
    const validated = ensureGetRequest(params);
    return this.transport.requestService<KeywordsGetResult>(
      "keywords",
      { method: "get", params: validated },
      applyIdempotency(options, true),
    );
  }

  async add(
    params: KeywordsAddRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<KeywordsAddResult>>> {
    const validated = ensureAddRequest(params);
    return this.transport.requestService<KeywordsAddResult>(
      "keywords",
      { method: "add", params: validated },
      applyIdempotency(options, false),
    );
  }

  async update(
    params: KeywordsUpdateRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<KeywordsUpdateResult>>> {
    const validated = ensureUpdateRequest(params);
    return this.transport.requestService<KeywordsUpdateResult>(
      "keywords",
      { method: "update", params: validated },
      applyIdempotency(options, false),
    );
  }

  async delete(
    params: KeywordsDeleteRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<KeywordsDeleteResult>>> {
    const validated = ensureDeleteRequest(params);
    return this.transport.requestService<KeywordsDeleteResult>(
      "keywords",
      { method: "delete", params: validated },
      applyIdempotency(options, true),
    );
  }

  async suspend(
    params: KeywordsStateRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<KeywordsSuspendResult>>> {
    const validated = ensureStateRequest(params);
    return this.transport.requestService<KeywordsSuspendResult>(
      "keywords",
      { method: "suspend", params: validated },
      applyIdempotency(options, true),
    );
  }

  async resume(
    params: KeywordsStateRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<KeywordsResumeResult>>> {
    const validated = ensureStateRequest(params);
    return this.transport.requestService<KeywordsResumeResult>(
      "keywords",
      { method: "resume", params: validated },
      applyIdempotency(options, true),
    );
  }
}
