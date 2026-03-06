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
  ensurePaginationPage,
  ensurePositiveInteger,
} from "../shared/validation.js";
import type { JsonEnvelope, RequestOptions, TransportResponse } from "../types.js";
import { YandexDirectTransport } from "../transport.js";

const ADGROUPS_SERVICE = "adgroups";

export type AdGroupType =
  | "TEXT_AD_GROUP"
  | "MOBILE_APP_AD_GROUP"
  | "DYNAMIC_TEXT_AD_GROUP"
  | "CPM_BANNER_AD_GROUP"
  | "CPM_VIDEO_AD_GROUP"
  | "SMART_AD_GROUP"
  | "UNIFIED_AD_GROUP";

export type AdGroupStatus = "ACCEPTED" | "DRAFT" | "MODERATION" | "PREACCEPTED" | "REJECTED";
export type AdGroupServingStatus = "ELIGIBLE" | "RARELY_SERVED";
export type AdGroupAppIconStatus = "ACCEPTED" | "MODERATION" | "REJECTED";

export type AdGroupField =
  | "Id"
  | "Name"
  | "CampaignId"
  | "RegionIds"
  | "RestrictedRegionIds"
  | "NegativeKeywords"
  | "NegativeKeywordSharedSetIds"
  | "TrackingParams"
  | "Status"
  | "ServingStatus"
  | "Type";

export interface ArrayOfString {
  Items: readonly string[];
}

export interface ArrayOfLong {
  Items: YandexDirectIds;
}

export interface AdGroupsSelectionCriteria extends SelectionCriteriaBase {
  CampaignIds?: YandexDirectIds;
  Types?: readonly AdGroupType[];
  Statuses?: readonly AdGroupStatus[];
  ServingStatuses?: readonly AdGroupServingStatus[];
  AppIconStatuses?: readonly AdGroupAppIconStatus[];
  NegativeKeywordSharedSetIds?: YandexDirectIds;
}

export interface AdGroupsGetRequest {
  SelectionCriteria: AdGroupsSelectionCriteria;
  FieldNames: readonly AdGroupField[];
  MobileAppAdGroupFieldNames?: readonly string[];
  DynamicTextAdGroupFieldNames?: readonly string[];
  DynamicTextFeedAdGroupFieldNames?: readonly string[];
  SmartAdGroupFieldNames?: readonly string[];
  TextAdGroupFeedParamsFieldNames?: readonly string[];
  UnifiedAdGroupFieldNames?: readonly string[];
  Page?: PaginationPage;
}

export interface AdGroupMutationBase {
  Name?: string;
  RegionIds?: readonly number[];
  NegativeKeywords?: ArrayOfString | null;
  NegativeKeywordSharedSetIds?: ArrayOfLong | null;
  TrackingParams?: string | null;
  [key: string]: unknown;
}

export interface AdGroupAddItem extends AdGroupMutationBase {
  Name: string;
  CampaignId: YandexDirectId;
  RegionIds: readonly number[];
}

export interface AdGroupUpdateItem extends AdGroupMutationBase {
  Id: YandexDirectId;
}

export interface AdGroupsAddRequest {
  AdGroups: readonly AdGroupAddItem[];
}

export interface AdGroupsUpdateRequest {
  AdGroups: readonly AdGroupUpdateItem[];
}

export interface AdGroupsStateSelectionCriteria {
  Ids: YandexDirectIds;
}

export interface AdGroupsStateRequest {
  SelectionCriteria: AdGroupsStateSelectionCriteria;
}

export interface AdGroupGetItem {
  Id?: YandexDirectId;
  Name?: string;
  CampaignId?: YandexDirectId;
  RegionIds?: readonly number[];
  RestrictedRegionIds?: ArrayOfLong | null;
  NegativeKeywords?: ArrayOfString | null;
  NegativeKeywordSharedSetIds?: ArrayOfLong | null;
  TrackingParams?: string;
  Status?: AdGroupStatus;
  ServingStatus?: AdGroupServingStatus;
  Type?: AdGroupType;
  [key: string]: unknown;
}

export interface AdGroupsGetResult {
  AdGroups: AdGroupGetItem[];
}

export type AdGroupsAddResult = AddMutationResult;
export type AdGroupsUpdateResult = UpdateMutationResult;
export type AdGroupsSuspendResult = StateTransitionMutationResult<"SuspendResults">;
export type AdGroupsResumeResult = StateTransitionMutationResult<"ResumeResults">;

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

function ensureInteger(value: unknown, name: string): number {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer.`);
  }
  return Number(value);
}

function ensureRegionIds(value: unknown, name: string): number[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${name} must be a non-empty array of integers.`);
  }

  const ids = value.map((entry, index) => ensureInteger(entry, `${name}[${index}]`));
  const hasAllRegions = ids.includes(0);
  const hasMinusRegions = ids.some((entry) => entry < 0);
  const hasNonNegativeRegions = ids.some((entry) => entry >= 0);

  if (hasAllRegions && hasMinusRegions) {
    throw new TypeError(`${name} cannot contain negative region IDs when 0 is present.`);
  }
  if (!hasNonNegativeRegions) {
    throw new TypeError(`${name} must include at least one non-negative region ID.`);
  }

  return ids;
}

function ensureArrayOfString(value: unknown, name: string): ArrayOfString {
  const record = asRecord(value, name);
  const items = ensureStringList(record.Items, `${name}.Items`);
  return { Items: items };
}

function ensureArrayOfLong(value: unknown, name: string): ArrayOfLong {
  const record = asRecord(value, name);
  const items = ensureNonEmptyIds(record.Items, `${name}.Items`);
  return { Items: items };
}

function ensureNonEmptyIds(value: unknown, name: string): YandexDirectIds {
  const ids = ensureIds(value, name);
  if (ids.length === 0) {
    throw new TypeError(`${name} must contain at least one ID.`);
  }
  return ids;
}

function ensureSelectionCriteria(value: unknown): AdGroupsSelectionCriteria {
  const record = asRecord(value, "params.SelectionCriteria");
  const ids = record.Ids === undefined
    ? undefined
    : ensureNonEmptyIds(record.Ids, "params.SelectionCriteria.Ids");
  const campaignIds = record.CampaignIds === undefined
    ? undefined
    : ensureNonEmptyIds(record.CampaignIds, "params.SelectionCriteria.CampaignIds");

  if (!ids && !campaignIds) {
    throw new TypeError("params.SelectionCriteria must contain at least one of Ids or CampaignIds.");
  }

  return {
    ...record,
    Ids: ids,
    CampaignIds: campaignIds,
    Types: record.Types === undefined
      ? undefined
      : ensureStringList(record.Types, "params.SelectionCriteria.Types") as AdGroupType[],
    Statuses: record.Statuses === undefined
      ? undefined
      : ensureStringList(record.Statuses, "params.SelectionCriteria.Statuses") as AdGroupStatus[],
    ServingStatuses: record.ServingStatuses === undefined
      ? undefined
      : ensureStringList(
        record.ServingStatuses,
        "params.SelectionCriteria.ServingStatuses",
      ) as AdGroupServingStatus[],
    AppIconStatuses: record.AppIconStatuses === undefined
      ? undefined
      : ensureStringList(record.AppIconStatuses, "params.SelectionCriteria.AppIconStatuses") as AdGroupAppIconStatus[],
    NegativeKeywordSharedSetIds: record.NegativeKeywordSharedSetIds === undefined
      ? undefined
      : ensureNonEmptyIds(
        record.NegativeKeywordSharedSetIds,
        "params.SelectionCriteria.NegativeKeywordSharedSetIds",
      ),
  };
}

function ensureGetRequest(value: unknown): AdGroupsGetRequest {
  const record = asRecord(value, "params");
  return {
    ...record,
    SelectionCriteria: ensureSelectionCriteria(record.SelectionCriteria),
    FieldNames: ensureFieldNames(record.FieldNames, "params.FieldNames") as AdGroupField[],
    MobileAppAdGroupFieldNames: record.MobileAppAdGroupFieldNames === undefined
      ? undefined
      : ensureFieldNames(record.MobileAppAdGroupFieldNames, "params.MobileAppAdGroupFieldNames"),
    DynamicTextAdGroupFieldNames: record.DynamicTextAdGroupFieldNames === undefined
      ? undefined
      : ensureFieldNames(record.DynamicTextAdGroupFieldNames, "params.DynamicTextAdGroupFieldNames"),
    DynamicTextFeedAdGroupFieldNames: record.DynamicTextFeedAdGroupFieldNames === undefined
      ? undefined
      : ensureFieldNames(
        record.DynamicTextFeedAdGroupFieldNames,
        "params.DynamicTextFeedAdGroupFieldNames",
      ),
    SmartAdGroupFieldNames: record.SmartAdGroupFieldNames === undefined
      ? undefined
      : ensureFieldNames(record.SmartAdGroupFieldNames, "params.SmartAdGroupFieldNames"),
    TextAdGroupFeedParamsFieldNames: record.TextAdGroupFeedParamsFieldNames === undefined
      ? undefined
      : ensureFieldNames(record.TextAdGroupFeedParamsFieldNames, "params.TextAdGroupFeedParamsFieldNames"),
    UnifiedAdGroupFieldNames: record.UnifiedAdGroupFieldNames === undefined
      ? undefined
      : ensureFieldNames(record.UnifiedAdGroupFieldNames, "params.UnifiedAdGroupFieldNames"),
    Page: record.Page === undefined ? undefined : ensurePaginationPage(record.Page, "params.Page"),
  };
}

function ensureAdGroupMutationBase(record: Record<string, unknown>, name: string): void {
  if (record.Name !== undefined) {
    ensureNonEmptyString(record.Name, `${name}.Name`);
  }
  if (record.RegionIds !== undefined) {
    ensureRegionIds(record.RegionIds, `${name}.RegionIds`);
  }
  if (record.NegativeKeywords !== undefined && record.NegativeKeywords !== null) {
    ensureArrayOfString(record.NegativeKeywords, `${name}.NegativeKeywords`);
  }
  if (record.NegativeKeywordSharedSetIds !== undefined && record.NegativeKeywordSharedSetIds !== null) {
    ensureArrayOfLong(record.NegativeKeywordSharedSetIds, `${name}.NegativeKeywordSharedSetIds`);
  }
  if (record.TrackingParams !== undefined && record.TrackingParams !== null) {
    ensureNonEmptyString(record.TrackingParams, `${name}.TrackingParams`);
  }
}

function ensureAddItem(value: unknown, name: string): AdGroupAddItem {
  const record = asRecord(value, name);
  ensureAdGroupMutationBase(record, name);

  return {
    ...record,
    Name: ensureNonEmptyString(record.Name, `${name}.Name`),
    CampaignId: ensurePositiveInteger(record.CampaignId, `${name}.CampaignId`),
    RegionIds: ensureRegionIds(record.RegionIds, `${name}.RegionIds`),
    NegativeKeywords: record.NegativeKeywords === undefined
      ? undefined
      : record.NegativeKeywords === null
        ? null
        : ensureArrayOfString(record.NegativeKeywords, `${name}.NegativeKeywords`),
    NegativeKeywordSharedSetIds: record.NegativeKeywordSharedSetIds === undefined
      ? undefined
      : record.NegativeKeywordSharedSetIds === null
        ? null
        : ensureArrayOfLong(record.NegativeKeywordSharedSetIds, `${name}.NegativeKeywordSharedSetIds`),
    TrackingParams: record.TrackingParams === undefined
      ? undefined
      : record.TrackingParams === null
        ? null
        : ensureNonEmptyString(record.TrackingParams, `${name}.TrackingParams`),
  };
}

function ensureUpdateItem(value: unknown, name: string): AdGroupUpdateItem {
  const record = asRecord(value, name);
  ensureAdGroupMutationBase(record, name);

  const hasChanges = Object.entries(record).some(([key, entryValue]) => key !== "Id" && entryValue !== undefined);
  if (!hasChanges) {
    throw new TypeError(`${name} must contain at least one field to update besides Id.`);
  }

  return {
    ...record,
    Id: ensurePositiveInteger(record.Id, `${name}.Id`),
    Name: record.Name === undefined ? undefined : ensureNonEmptyString(record.Name, `${name}.Name`),
    RegionIds: record.RegionIds === undefined ? undefined : ensureRegionIds(record.RegionIds, `${name}.RegionIds`),
    NegativeKeywords: record.NegativeKeywords === undefined
      ? undefined
      : record.NegativeKeywords === null
        ? null
        : ensureArrayOfString(record.NegativeKeywords, `${name}.NegativeKeywords`),
    NegativeKeywordSharedSetIds: record.NegativeKeywordSharedSetIds === undefined
      ? undefined
      : record.NegativeKeywordSharedSetIds === null
        ? null
        : ensureArrayOfLong(record.NegativeKeywordSharedSetIds, `${name}.NegativeKeywordSharedSetIds`),
    TrackingParams: record.TrackingParams === undefined
      ? undefined
      : record.TrackingParams === null
        ? null
        : ensureNonEmptyString(record.TrackingParams, `${name}.TrackingParams`),
  };
}

function ensureAddRequest(value: unknown): AdGroupsAddRequest {
  const record = asRecord(value, "params");
  if (!Array.isArray(record.AdGroups) || record.AdGroups.length === 0) {
    throw new TypeError("params.AdGroups must be a non-empty array.");
  }

  return {
    ...record,
    AdGroups: record.AdGroups.map((entry, index) => ensureAddItem(entry, `params.AdGroups[${index}]`)),
  };
}

function ensureUpdateRequest(value: unknown): AdGroupsUpdateRequest {
  const record = asRecord(value, "params");
  if (!Array.isArray(record.AdGroups) || record.AdGroups.length === 0) {
    throw new TypeError("params.AdGroups must be a non-empty array.");
  }

  return {
    ...record,
    AdGroups: record.AdGroups.map((entry, index) => ensureUpdateItem(entry, `params.AdGroups[${index}]`)),
  };
}

function ensureStateRequest(value: unknown): AdGroupsStateRequest {
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

export class AdGroupsService {
  constructor(private readonly transport: YandexDirectTransport) {}

  async get(
    params: AdGroupsGetRequest,
    options: RequestOptions = {},
  ): Promise<TransportResponse<JsonEnvelope<AdGroupsGetResult>>> {
    const validated = ensureGetRequest(params);
    const body: JsonRpcRequestEnvelope<"get", AdGroupsGetRequest> = {
      method: "get",
      params: validated,
    };
    return this.transport.requestService<AdGroupsGetResult>(
      ADGROUPS_SERVICE,
      body,
      applyIdempotency(options, true),
    );
  }

  async add(
    params: AdGroupsAddRequest,
    options: RequestOptions = {},
  ): Promise<TransportResponse<JsonEnvelope<AdGroupsAddResult>>> {
    const validated = ensureAddRequest(params);
    const body: JsonRpcRequestEnvelope<"add", AdGroupsAddRequest> = {
      method: "add",
      params: validated,
    };
    return this.transport.requestService<AdGroupsAddResult>(
      ADGROUPS_SERVICE,
      body,
      applyIdempotency(options, false),
    );
  }

  async update(
    params: AdGroupsUpdateRequest,
    options: RequestOptions = {},
  ): Promise<TransportResponse<JsonEnvelope<AdGroupsUpdateResult>>> {
    const validated = ensureUpdateRequest(params);
    const body: JsonRpcRequestEnvelope<"update", AdGroupsUpdateRequest> = {
      method: "update",
      params: validated,
    };
    return this.transport.requestService<AdGroupsUpdateResult>(
      ADGROUPS_SERVICE,
      body,
      applyIdempotency(options, false),
    );
  }

  async suspend(
    params: AdGroupsStateRequest,
    options: RequestOptions = {},
  ): Promise<TransportResponse<JsonEnvelope<AdGroupsSuspendResult>>> {
    const validated = ensureStateRequest(params);
    const body: JsonRpcRequestEnvelope<"suspend", AdGroupsStateRequest> = {
      method: "suspend",
      params: validated,
    };
    return this.transport.requestService<AdGroupsSuspendResult>(
      ADGROUPS_SERVICE,
      body,
      applyIdempotency(options, true),
    );
  }

  async resume(
    params: AdGroupsStateRequest,
    options: RequestOptions = {},
  ): Promise<TransportResponse<JsonEnvelope<AdGroupsResumeResult>>> {
    const validated = ensureStateRequest(params);
    const body: JsonRpcRequestEnvelope<"resume", AdGroupsStateRequest> = {
      method: "resume",
      params: validated,
    };
    return this.transport.requestService<AdGroupsResumeResult>(
      ADGROUPS_SERVICE,
      body,
      applyIdempotency(options, true),
    );
  }
}
