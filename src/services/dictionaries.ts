import type {
  JsonRpcRequestEnvelope,
  PaginationPage,
} from "../shared/contracts.js";
import {
  ensureIds,
  ensureNonEmptyString,
  ensurePaginationPage,
} from "../shared/validation.js";
import type { JsonEnvelope, RequestOptions, TransportResponse } from "../types.js";
import { YandexDirectTransport } from "../transport.js";

export type DictionaryName =
  | "Currencies"
  | "MetroStations"
  | "GeoRegions"
  | "GeoRegionNames"
  | "TimeZones"
  | "Constants"
  | "AdCategories"
  | "OperationSystemVersions"
  | "ProductivityAssertions"
  | "SupplySidePlatforms"
  | "Interests"
  | "AudienceCriteriaTypes"
  | "AudienceDemographicProfiles"
  | "AudienceInterests"
  | "FilterSchemas"
  | (string & {});

export interface DictionariesGetRequest {
  DictionaryNames: readonly DictionaryName[];
}

export interface DictionaryConstantItem {
  Name: string;
  Value: string;
}

export interface DictionariesGetResult {
  Currencies?: Array<{ Currency: string; Properties: DictionaryConstantItem[] }>;
  MetroStations?: Array<{ GeoRegionId: number; MetroStationId: number; MetroStationName: string }>;
  GeoRegions?: Array<{ GeoRegionId: number; GeoRegionName: string; GeoRegionType: string; ParentId?: number | null }>;
  GeoRegionNames?: Array<{ GeoRegionId: number; GeoRegionName: string }>;
  TimeZones?: Array<{ TimeZone: string; TimeZoneName: string; UtcOffset: number }>;
  Constants?: DictionaryConstantItem[];
  AdCategories?: Array<{ AdCategory: string; Description: string; Message: string }>;
  OperationSystemVersions?: Array<{ OsName: string; OsVersion: string }>;
  ProductivityAssertions?: unknown[];
  SupplySidePlatforms?: Array<{ Title: string }>;
  Interests?: Array<{ InterestId: number; ParentId?: number | null; Name: string; IsTargetable: string }>;
  AudienceCriteriaTypes?: Array<Record<string, unknown>>;
  AudienceDemographicProfiles?: Array<Record<string, unknown>>;
  AudienceInterests?: Array<Record<string, unknown>>;
  FilterSchemas?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export type GeoRegionFieldName = "GeoRegionId" | "GeoRegionName" | "ParentGeoRegionNames" | (string & {});

export interface DictionariesGeoRegionsSelectionCriteria {
  Name?: string;
  RegionIds?: readonly number[];
  ExactNames?: readonly string[];
}

export interface DictionariesGetGeoRegionsRequest {
  SelectionCriteria: DictionariesGeoRegionsSelectionCriteria;
  FieldNames: readonly GeoRegionFieldName[];
  Page?: PaginationPage;
}

export interface DictionariesGetGeoRegionItem {
  GeoRegionId?: number;
  GeoRegionName?: string;
  ParentGeoRegionNames?: { Items: string[] };
  [key: string]: unknown;
}

export interface DictionariesGetGeoRegionsResult {
  GeoRegions: DictionariesGetGeoRegionItem[];
  LimitedBy?: number;
}

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function ensureStringArray(value: unknown, name: string, allowEmpty = false): string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new TypeError(`${name} must be ${allowEmpty ? "an array" : "a non-empty array"} of strings.`);
  }

  return value.map((entry, index) => ensureNonEmptyString(entry, `${name}[${index}]`));
}

function ensureGetRequest(value: unknown): DictionariesGetRequest {
  const record = asRecord(value, "params");
  return {
    DictionaryNames: ensureStringArray(record.DictionaryNames, "params.DictionaryNames") as DictionaryName[],
  };
}

function ensureGeoRegionsSelectionCriteria(value: unknown): DictionariesGeoRegionsSelectionCriteria {
  const record = asRecord(value, "params.SelectionCriteria");
  const name = record.Name === undefined ? undefined : ensureNonEmptyString(record.Name, "params.SelectionCriteria.Name");
  const regionIds = record.RegionIds === undefined ? undefined : ensureIds(record.RegionIds, "params.SelectionCriteria.RegionIds");
  const exactNames = record.ExactNames === undefined
    ? undefined
    : ensureStringArray(record.ExactNames, "params.SelectionCriteria.ExactNames");

  if (!name && !regionIds?.length && !exactNames?.length) {
    throw new TypeError(
      "params.SelectionCriteria must include at least one of Name, RegionIds, or ExactNames.",
    );
  }

  return {
    Name: name,
    RegionIds: regionIds,
    ExactNames: exactNames,
  };
}

function ensureGetGeoRegionsRequest(value: unknown): DictionariesGetGeoRegionsRequest {
  const record = asRecord(value, "params");
  return {
    SelectionCriteria: ensureGeoRegionsSelectionCriteria(record.SelectionCriteria),
    FieldNames: ensureStringArray(record.FieldNames, "params.FieldNames") as GeoRegionFieldName[],
    Page: record.Page === undefined ? undefined : ensurePaginationPage(record.Page, "params.Page"),
  };
}

function applyIdempotency(options: RequestOptions = {}): RequestOptions {
  return {
    ...options,
    idempotent: options.idempotent ?? true,
  };
}

export class DictionariesService {
  constructor(private readonly transport: YandexDirectTransport) {}

  async get(
    params: DictionariesGetRequest,
    options: RequestOptions = {},
  ): Promise<TransportResponse<JsonEnvelope<DictionariesGetResult>>> {
    const validated = ensureGetRequest(params);
    const body: JsonRpcRequestEnvelope<"get", DictionariesGetRequest> = {
      method: "get",
      params: validated,
    };

    return this.transport.requestService<DictionariesGetResult>(
      "dictionaries",
      body,
      applyIdempotency(options),
    );
  }

  async getGeoRegions(
    params: DictionariesGetGeoRegionsRequest,
    options: RequestOptions = {},
  ): Promise<TransportResponse<JsonEnvelope<DictionariesGetGeoRegionsResult>>> {
    const validated = ensureGetGeoRegionsRequest(params);
    const body: JsonRpcRequestEnvelope<"getGeoRegions", DictionariesGetGeoRegionsRequest> = {
      method: "getGeoRegions",
      params: validated,
    };

    return this.transport.requestService<DictionariesGetGeoRegionsResult>(
      "dictionaries",
      body,
      applyIdempotency(options),
    );
  }
}
