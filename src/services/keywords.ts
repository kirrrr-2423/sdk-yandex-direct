import type {
  AddMutationResult,
  JsonRpcRequestEnvelope,
  PaginationPage,
  SelectionCriteriaBase,
  StateTransitionMutationResult,
  UpdateMutationResult,
  YandexDirectId,
  YandexDirectIds,
} from "../shared/contracts.js";
import {
  ensureIds,
  ensureNonEmptyString,
  ensureNonNegativeInteger,
  ensurePaginationPage,
  ensurePositiveInteger,
} from "../shared/validation.js";
import type { JsonEnvelope, RequestOptions, TransportResponse } from "../types.js";
import { YandexDirectTransport } from "../transport.js";

const KEYWORDS_SERVICE = "keywords";

export type KeywordState = "ON" | "OFF" | "SUSPENDED";
export type KeywordStatus = "ACCEPTED" | "DRAFT" | "MODERATION" | "PREACCEPTED" | "REJECTED";
export type KeywordServingStatus = "ELIGIBLE" | "RARELY_SERVED";
export type KeywordStrategyPriority = "LOW" | "NORMAL" | "HIGH";

export type KeywordField =
  | "Id"
  | "Keyword"
  | "AdGroupId"
  | "CampaignId"
  | "State"
  | "Status"
  | "ServingStatus"
  | "StrategyPriority"
  | "Bid"
  | "ContextBid"
  | "MinSearchPrice"
  | "CurrentSearchPrice"
  | "MinPrice"
  | "CurrentPrice"
  | "PremiumMinBid"
  | "MinBid"
  | "CurrentOnSearch"
  | "CurrentOnContext"
  | "UserParam1"
  | "UserParam2";

export interface KeywordsSelectionCriteria extends SelectionCriteriaBase {
  AdGroupIds?: YandexDirectIds;
  CampaignIds?: YandexDirectIds;
  States?: readonly KeywordState[];
  Statuses?: readonly KeywordStatus[];
}

export interface KeywordBidPricing {
  Bid?: number;
  ContextBid?: number;
  StrategyPriority?: KeywordStrategyPriority;
  MinSearchPrice?: number;
  CurrentSearchPrice?: number;
  MinPrice?: number;
  CurrentPrice?: number;
  PremiumMinBid?: number;
  MinBid?: number;
  CurrentOnSearch?: number;
  CurrentOnContext?: number;
}

export interface KeywordsGetRequest {
  SelectionCriteria: KeywordsSelectionCriteria;
  FieldNames: readonly KeywordField[];
  Page?: PaginationPage;
}

export interface KeywordMutationBase extends KeywordBidPricing {
  Keyword?: string;
  UserParam1?: string | null;
  UserParam2?: string | null;
}

export interface KeywordAddItem extends KeywordMutationBase {
  Keyword: string;
  AdGroupId: YandexDirectId;
}

export interface KeywordUpdateItem extends KeywordMutationBase {
  Id: YandexDirectId;
}

export interface KeywordsAddRequest {
  Keywords: readonly KeywordAddItem[];
}

export interface KeywordsUpdateRequest {
  Keywords: readonly KeywordUpdateItem[];
}

export interface KeywordsStateSelectionCriteria {
  Ids: YandexDirectIds;
}

export interface KeywordsStateRequest {
  SelectionCriteria: KeywordsStateSelectionCriteria;
}

export interface KeywordGetItem extends KeywordBidPricing {
  Id?: YandexDirectId;
  Keyword?: string;
  AdGroupId?: YandexDirectId;
  CampaignId?: YandexDirectId;
  State?: KeywordState;
  Status?: KeywordStatus;
  ServingStatus?: KeywordServingStatus;
  UserParam1?: string;
  UserParam2?: string;
  [key: string]: unknown;
}

export interface KeywordsGetResult {
  Keywords: KeywordGetItem[];
}

export type KeywordsAddResult = AddMutationResult;
export type KeywordsUpdateResult = UpdateMutationResult;
export type KeywordsSuspendResult = StateTransitionMutationResult<"SuspendResults">;
export type KeywordsResumeResult = StateTransitionMutationResult<"ResumeResults">;

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function ensureFieldNames(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${name} must be a non-empty array of strings.`);
  }
  return value.map((entry, index) => ensureNonEmptyString(entry, `${name}[${index}]`));
}

function ensureStringList(value: unknown, name: string): string[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array of strings.`);
  }
  return value.map((entry, index) => ensureNonEmptyString(entry, `${name}[${index}]`));
}

function ensureNonEmptyIds(value: unknown, name: string): YandexDirectIds {
  const ids = ensureIds(value, name);
  if (ids.length === 0) {
    throw new TypeError(`${name} must contain at least one ID.`);
  }
  return ids;
}

function ensureBidValue(value: unknown, name: string): number {
  return ensureNonNegativeInteger(value, name);
}

function ensureStrategyPriority(value: unknown, name: string): KeywordStrategyPriority {
  const normalized = ensureNonEmptyString(value, name).toUpperCase();
  if (normalized !== "LOW" && normalized !== "NORMAL" && normalized !== "HIGH") {
    throw new TypeError(`${name} must be one of LOW, NORMAL, HIGH.`);
  }
  return normalized as KeywordStrategyPriority;
}

function ensureSelectionCriteria(value: unknown): KeywordsSelectionCriteria {
  const record = asRecord(value, "params.SelectionCriteria");
  const ids = record.Ids === undefined
    ? undefined
    : ensureNonEmptyIds(record.Ids, "params.SelectionCriteria.Ids");
  const adGroupIds = record.AdGroupIds === undefined
    ? undefined
    : ensureNonEmptyIds(record.AdGroupIds, "params.SelectionCriteria.AdGroupIds");
  const campaignIds = record.CampaignIds === undefined
    ? undefined
    : ensureNonEmptyIds(record.CampaignIds, "params.SelectionCriteria.CampaignIds");

  if (!ids && !adGroupIds && !campaignIds) {
    throw new TypeError(
      "params.SelectionCriteria must contain at least one of Ids, AdGroupIds, or CampaignIds.",
    );
  }

  return {
    ...record,
    Ids: ids,
    AdGroupIds: adGroupIds,
    CampaignIds: campaignIds,
    States: record.States === undefined
      ? undefined
      : ensureStringList(record.States, "params.SelectionCriteria.States") as KeywordState[],
    Statuses: record.Statuses === undefined
      ? undefined
      : ensureStringList(record.Statuses, "params.SelectionCriteria.Statuses") as KeywordStatus[],
  };
}

function ensureGetRequest(value: unknown): KeywordsGetRequest {
  const record = asRecord(value, "params");
  return {
    ...record,
    SelectionCriteria: ensureSelectionCriteria(record.SelectionCriteria),
    FieldNames: ensureFieldNames(record.FieldNames, "params.FieldNames") as KeywordField[],
    Page: record.Page === undefined ? undefined : ensurePaginationPage(record.Page, "params.Page"),
  };
}

function ensureNullableString(value: unknown, name: string): string | null {
  if (value === null) {
    return null;
  }
  return ensureNonEmptyString(value, name);
}

function ensureMutationBase(record: Record<string, unknown>, name: string): void {
  if (record.Keyword !== undefined) {
    ensureNonEmptyString(record.Keyword, `${name}.Keyword`);
  }
  if (record.Bid !== undefined) {
    ensureBidValue(record.Bid, `${name}.Bid`);
  }
  if (record.ContextBid !== undefined) {
    ensureBidValue(record.ContextBid, `${name}.ContextBid`);
  }
  if (record.StrategyPriority !== undefined) {
    ensureStrategyPriority(record.StrategyPriority, `${name}.StrategyPriority`);
  }
  if (record.UserParam1 !== undefined && record.UserParam1 !== null) {
    ensureNonEmptyString(record.UserParam1, `${name}.UserParam1`);
  }
  if (record.UserParam2 !== undefined && record.UserParam2 !== null) {
    ensureNonEmptyString(record.UserParam2, `${name}.UserParam2`);
  }
}

function ensureAddItem(value: unknown, name: string): KeywordAddItem {
  const record = asRecord(value, name);
  ensureMutationBase(record, name);
  return {
    ...record,
    Keyword: ensureNonEmptyString(record.Keyword, `${name}.Keyword`),
    AdGroupId: ensurePositiveInteger(record.AdGroupId, `${name}.AdGroupId`),
    Bid: record.Bid === undefined ? undefined : ensureBidValue(record.Bid, `${name}.Bid`),
    ContextBid: record.ContextBid === undefined
      ? undefined
      : ensureBidValue(record.ContextBid, `${name}.ContextBid`),
    StrategyPriority: record.StrategyPriority === undefined
      ? undefined
      : ensureStrategyPriority(record.StrategyPriority, `${name}.StrategyPriority`),
    UserParam1: record.UserParam1 === undefined
      ? undefined
      : ensureNullableString(record.UserParam1, `${name}.UserParam1`),
    UserParam2: record.UserParam2 === undefined
      ? undefined
      : ensureNullableString(record.UserParam2, `${name}.UserParam2`),
  };
}

function ensureUpdateItem(value: unknown, name: string): KeywordUpdateItem {
  const record = asRecord(value, name);
  ensureMutationBase(record, name);

  const hasChanges = Object.entries(record).some(([key, entryValue]) => key !== "Id" && entryValue !== undefined);
  if (!hasChanges) {
    throw new TypeError(`${name} must contain at least one field to update besides Id.`);
  }

  return {
    ...record,
    Id: ensurePositiveInteger(record.Id, `${name}.Id`),
    Keyword: record.Keyword === undefined ? undefined : ensureNonEmptyString(record.Keyword, `${name}.Keyword`),
    Bid: record.Bid === undefined ? undefined : ensureBidValue(record.Bid, `${name}.Bid`),
    ContextBid: record.ContextBid === undefined
      ? undefined
      : ensureBidValue(record.ContextBid, `${name}.ContextBid`),
    StrategyPriority: record.StrategyPriority === undefined
      ? undefined
      : ensureStrategyPriority(record.StrategyPriority, `${name}.StrategyPriority`),
    UserParam1: record.UserParam1 === undefined
      ? undefined
      : ensureNullableString(record.UserParam1, `${name}.UserParam1`),
    UserParam2: record.UserParam2 === undefined
      ? undefined
      : ensureNullableString(record.UserParam2, `${name}.UserParam2`),
  };
}

function ensureAddRequest(value: unknown): KeywordsAddRequest {
  const record = asRecord(value, "params");
  if (!Array.isArray(record.Keywords) || record.Keywords.length === 0) {
    throw new TypeError("params.Keywords must be a non-empty array.");
  }

  return {
    ...record,
    Keywords: record.Keywords.map((entry, index) => ensureAddItem(entry, `params.Keywords[${index}]`)),
  };
}

function ensureUpdateRequest(value: unknown): KeywordsUpdateRequest {
  const record = asRecord(value, "params");
  if (!Array.isArray(record.Keywords) || record.Keywords.length === 0) {
    throw new TypeError("params.Keywords must be a non-empty array.");
  }

  return {
    ...record,
    Keywords: record.Keywords.map((entry, index) => ensureUpdateItem(entry, `params.Keywords[${index}]`)),
  };
}

function ensureStateRequest(value: unknown): KeywordsStateRequest {
  const record = asRecord(value, "params");
  const criteria = asRecord(record.SelectionCriteria, "params.SelectionCriteria");
  return {
    SelectionCriteria: {
      Ids: ensureNonEmptyIds(criteria.Ids, "params.SelectionCriteria.Ids"),
    },
  };
}

function applyIdempotency(options: RequestOptions, defaultIdempotent: boolean): RequestOptions {
  return {
    ...options,
    idempotent: options.idempotent ?? defaultIdempotent,
  };
}

export class KeywordsService {
  constructor(private readonly transport: YandexDirectTransport) {}

  async get(
    params: KeywordsGetRequest,
    options: RequestOptions = {},
  ): Promise<TransportResponse<JsonEnvelope<KeywordsGetResult>>> {
    const validated = ensureGetRequest(params);
    const body: JsonRpcRequestEnvelope<"get", KeywordsGetRequest> = {
      method: "get",
      params: validated,
    };
    return this.transport.requestService<KeywordsGetResult>(
      KEYWORDS_SERVICE,
      body,
      applyIdempotency(options, true),
    );
  }

  async add(
    params: KeywordsAddRequest,
    options: RequestOptions = {},
  ): Promise<TransportResponse<JsonEnvelope<KeywordsAddResult>>> {
    const validated = ensureAddRequest(params);
    const body: JsonRpcRequestEnvelope<"add", KeywordsAddRequest> = {
      method: "add",
      params: validated,
    };
    return this.transport.requestService<KeywordsAddResult>(
      KEYWORDS_SERVICE,
      body,
      applyIdempotency(options, false),
    );
  }

  async update(
    params: KeywordsUpdateRequest,
    options: RequestOptions = {},
  ): Promise<TransportResponse<JsonEnvelope<KeywordsUpdateResult>>> {
    const validated = ensureUpdateRequest(params);
    const body: JsonRpcRequestEnvelope<"update", KeywordsUpdateRequest> = {
      method: "update",
      params: validated,
    };
    return this.transport.requestService<KeywordsUpdateResult>(
      KEYWORDS_SERVICE,
      body,
      applyIdempotency(options, false),
    );
  }

  async suspend(
    params: KeywordsStateRequest,
    options: RequestOptions = {},
  ): Promise<TransportResponse<JsonEnvelope<KeywordsSuspendResult>>> {
    const validated = ensureStateRequest(params);
    const body: JsonRpcRequestEnvelope<"suspend", KeywordsStateRequest> = {
      method: "suspend",
      params: validated,
    };
    return this.transport.requestService<KeywordsSuspendResult>(
      KEYWORDS_SERVICE,
      body,
      applyIdempotency(options, true),
    );
  }

  async resume(
    params: KeywordsStateRequest,
    options: RequestOptions = {},
  ): Promise<TransportResponse<JsonEnvelope<KeywordsResumeResult>>> {
    const validated = ensureStateRequest(params);
    const body: JsonRpcRequestEnvelope<"resume", KeywordsStateRequest> = {
      method: "resume",
      params: validated,
    };
    return this.transport.requestService<KeywordsResumeResult>(
      KEYWORDS_SERVICE,
      body,
      applyIdempotency(options, true),
    );
  }
}
