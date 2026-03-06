import type { JsonRpcRequestEnvelope } from "../shared/contracts.js";
import { ensureNonEmptyString } from "../shared/validation.js";
import { YandexDirectTransport } from "../transport.js";
import type {
  JsonEnvelope,
  RequestOptions,
  TransportMetadata,
  TransportResponse,
} from "../types.js";

const DICTIONARIES_SERVICE = "dictionaries";

export const DICTIONARY_NAMES = [
  "Currencies",
  "MetroStations",
  "GeoRegions",
  "GeoRegionNames",
  "TimeZones",
  "Constants",
  "AdCategories",
  "OperationSystemVersions",
  "ProductivityAssertions",
  "SupplySidePlatforms",
  "Interests",
  "AudienceCriteriaTypes",
  "AudienceDemographicProfiles",
  "AudienceInterests",
  "FilterSchemas",
] as const;

export type DictionaryName = (typeof DICTIONARY_NAMES)[number];

export type YesNoEnum = "YES" | "NO";
export type CanSelectEnum = "ALL" | "EXCEPT_ALL";
export type AudienceInterestType = "SHORT_TERM" | "LONG_TERM" | "ANY";
export type FilterFieldType = "Enum" | "Number" | "String";
export type FilterOperatorType =
  | "CONTAINS_ANY"
  | "EQUALS_ANY"
  | "EXISTS"
  | "GREATER_THAN"
  | "IN_RANGE"
  | "LESS_THAN"
  | "NOT_CONTAINS_ALL";

export interface ConstantsItem {
  Name: string;
  Value: string;
}

export interface CurrenciesItem {
  Currency: string;
  Properties: ConstantsItem[];
}

export interface MetroStationsItem {
  GeoRegionId: number;
  MetroStationId: number;
  MetroStationName: string;
}

export interface GeoRegionsItem {
  GeoRegionId: number;
  GeoRegionName: string;
  GeoRegionType: string;
  ParentId: number | null;
}

export interface GeoRegionNamesItem {
  GeoRegionId: number;
  GeoRegionName: string;
  GeoRegionType: string;
}

export interface TimeZonesItem {
  TimeZone: string;
  TimeZoneName: string;
  UtcOffset: number;
}

export interface AdCategoriesItem {
  AdCategory: string;
  Description: string;
  Message: string;
}

export interface OperationSystemVersionsItem {
  OsName: string;
  OsVersion: string;
}

export interface ProductivityAssertionsItem {
  Key?: string;
  Value?: string;
}

export interface SupplySidePlatformsItem {
  Title: string;
}

export interface InterestsItem {
  InterestId: number;
  ParentId: number | null;
  Name: string;
  IsTargetable: YesNoEnum;
}

export interface AudienceCriteriaTypesItem {
  Type: string;
  BlockElement: string;
  Name: string;
  Description: string;
  CanSelect: CanSelectEnum;
}

export interface AudienceDemographicProfilesItem {
  Id: number;
  Type: string;
  Name: string;
  Description: string;
}

export interface AudienceInterestsItem {
  InterestKey: number;
  Id: number;
  ParentId: number;
  Name: string;
  Description: string;
  InterestType: AudienceInterestType;
}

export interface FilterSchemaEnumFieldValues {
  Items: string[];
}

export interface FilterSchemaEnumProps {
  Values: FilterSchemaEnumFieldValues;
}

export interface FilterSchemaNumberProps {
  Min: number;
  Max: number;
  Precision: number;
}

export interface FilterSchemaStringProps {
  MaxLength: number;
  MinLength: number;
}

export interface FilterSchemaOperator {
  MaxItems: number;
  Type: FilterOperatorType;
}

export interface FilterSchemasFieldItem {
  Name: string;
  Type: FilterFieldType;
  EnumProps?: FilterSchemaEnumProps;
  NumberProps?: FilterSchemaNumberProps;
  StringProps?: FilterSchemaStringProps;
  Operators: FilterSchemaOperator[];
}

export interface FilterSchemasItem {
  Name: string;
  Fields: FilterSchemasFieldItem[];
}

export interface DictionariesResultMap {
  Currencies: CurrenciesItem[];
  MetroStations: MetroStationsItem[];
  GeoRegions: GeoRegionsItem[];
  GeoRegionNames: GeoRegionNamesItem[];
  TimeZones: TimeZonesItem[];
  Constants: ConstantsItem[];
  AdCategories: AdCategoriesItem[];
  OperationSystemVersions: OperationSystemVersionsItem[];
  ProductivityAssertions: ProductivityAssertionsItem[];
  SupplySidePlatforms: SupplySidePlatformsItem[];
  Interests: InterestsItem[];
  AudienceCriteriaTypes: AudienceCriteriaTypesItem[];
  AudienceDemographicProfiles: AudienceDemographicProfilesItem[];
  AudienceInterests: AudienceInterestsItem[];
  FilterSchemas: FilterSchemasItem[];
}

export interface DictionariesGetRequest<TName extends DictionaryName = DictionaryName> {
  DictionaryNames: readonly TName[];
}

export interface DictionariesGetOptions extends RequestOptions {
  useCache?: boolean;
}

type MaybePromise<T> = T | Promise<T>;

export interface DictionariesCacheStrategy {
  get?<TName extends DictionaryName>(
    dictionaryName: TName,
  ): MaybePromise<DictionariesResultMap[TName] | undefined>;
  set?<TName extends DictionaryName>(
    dictionaryName: TName,
    entries: DictionariesResultMap[TName],
  ): MaybePromise<void>;
}

export interface DictionariesServiceOptions {
  cacheStrategy?: DictionariesCacheStrategy;
}

const DICTIONARY_NAME_SET = new Set<string>(DICTIONARY_NAMES);
const YES_NO_SET = new Set<YesNoEnum>(["YES", "NO"]);
const CAN_SELECT_SET = new Set<CanSelectEnum>(["ALL", "EXCEPT_ALL"]);
const INTEREST_TYPE_SET = new Set<AudienceInterestType>(["SHORT_TERM", "LONG_TERM", "ANY"]);
const FIELD_TYPE_SET = new Set<FilterFieldType>(["Enum", "Number", "String"]);
const OPERATOR_TYPE_SET = new Set<FilterOperatorType>([
  "CONTAINS_ANY",
  "EQUALS_ANY",
  "EXISTS",
  "GREATER_THAN",
  "IN_RANGE",
  "LESS_THAN",
  "NOT_CONTAINS_ALL",
]);

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function ensureArray(value: unknown, name: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array.`);
  }
  return value;
}

function ensureString(value: unknown, name: string): string {
  if (typeof value !== "string") {
    throw new TypeError(`${name} must be a string.`);
  }
  return value;
}

function ensureInteger(value: unknown, name: string): number {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer.`);
  }
  return Number(value);
}

function ensureFiniteNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number.`);
  }
  return value;
}

function ensureNullableInteger(value: unknown, name: string): number | null {
  if (value === null) {
    return null;
  }
  return ensureInteger(value, name);
}

function ensureEnumValue<TValue extends string>(
  value: unknown,
  name: string,
  allowed: ReadonlySet<TValue>,
): TValue {
  const normalized = ensureNonEmptyString(value, name);
  if (!allowed.has(normalized as TValue)) {
    throw new TypeError(`${name} must be one of: ${Array.from(allowed).join(", ")}.`);
  }
  return normalized as TValue;
}

function ensureDictionaryName(value: unknown, name: string): DictionaryName {
  const normalized = ensureNonEmptyString(value, name);
  if (!DICTIONARY_NAME_SET.has(normalized)) {
    throw new TypeError(`${name} has unsupported value "${normalized}".`);
  }
  return normalized as DictionaryName;
}

function dedupeDictionaryNames<TName extends DictionaryName>(names: readonly TName[]): TName[] {
  const seen = new Set<string>();
  const deduped: TName[] = [];
  for (const name of names) {
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    deduped.push(name);
  }
  return deduped;
}

function ensureDictionaryNames(value: unknown, name: string): DictionaryName[] {
  const items = ensureArray(value, name);
  if (items.length === 0) {
    throw new TypeError(`${name} must contain at least one dictionary name.`);
  }
  return dedupeDictionaryNames(items.map((entry, index) => ensureDictionaryName(entry, `${name}[${index}]`)));
}

function ensureConstantsItem(value: unknown, name: string): ConstantsItem {
  const record = asRecord(value, name);
  return {
    Name: ensureString(record.Name, `${name}.Name`),
    Value: ensureString(record.Value, `${name}.Value`),
  };
}

function ensureCurrenciesItem(value: unknown, name: string): CurrenciesItem {
  const record = asRecord(value, name);
  return {
    Currency: ensureString(record.Currency, `${name}.Currency`),
    Properties: ensureArray(record.Properties, `${name}.Properties`).map((entry, index) =>
      ensureConstantsItem(entry, `${name}.Properties[${index}]`)),
  };
}

function ensureMetroStationsItem(value: unknown, name: string): MetroStationsItem {
  const record = asRecord(value, name);
  return {
    GeoRegionId: ensureInteger(record.GeoRegionId, `${name}.GeoRegionId`),
    MetroStationId: ensureInteger(record.MetroStationId, `${name}.MetroStationId`),
    MetroStationName: ensureString(record.MetroStationName, `${name}.MetroStationName`),
  };
}

function ensureGeoRegionsItem(value: unknown, name: string): GeoRegionsItem {
  const record = asRecord(value, name);
  return {
    GeoRegionId: ensureInteger(record.GeoRegionId, `${name}.GeoRegionId`),
    GeoRegionName: ensureString(record.GeoRegionName, `${name}.GeoRegionName`),
    GeoRegionType: ensureString(record.GeoRegionType, `${name}.GeoRegionType`),
    ParentId: ensureNullableInteger(record.ParentId, `${name}.ParentId`),
  };
}

function ensureGeoRegionNamesItem(value: unknown, name: string): GeoRegionNamesItem {
  const record = asRecord(value, name);
  return {
    GeoRegionId: ensureInteger(record.GeoRegionId, `${name}.GeoRegionId`),
    GeoRegionName: ensureString(record.GeoRegionName, `${name}.GeoRegionName`),
    GeoRegionType: ensureString(record.GeoRegionType, `${name}.GeoRegionType`),
  };
}

function ensureTimeZonesItem(value: unknown, name: string): TimeZonesItem {
  const record = asRecord(value, name);
  return {
    TimeZone: ensureString(record.TimeZone, `${name}.TimeZone`),
    TimeZoneName: ensureString(record.TimeZoneName, `${name}.TimeZoneName`),
    UtcOffset: ensureInteger(record.UtcOffset, `${name}.UtcOffset`),
  };
}

function ensureAdCategoriesItem(value: unknown, name: string): AdCategoriesItem {
  const record = asRecord(value, name);
  return {
    AdCategory: ensureString(record.AdCategory, `${name}.AdCategory`),
    Description: ensureString(record.Description, `${name}.Description`),
    Message: ensureString(record.Message, `${name}.Message`),
  };
}

function ensureOperationSystemVersionsItem(value: unknown, name: string): OperationSystemVersionsItem {
  const record = asRecord(value, name);
  return {
    OsName: ensureString(record.OsName, `${name}.OsName`),
    OsVersion: ensureString(record.OsVersion, `${name}.OsVersion`),
  };
}

function ensureProductivityAssertionsItem(value: unknown, name: string): ProductivityAssertionsItem {
  const record = asRecord(value, name);
  return {
    Key: record.Key === undefined ? undefined : ensureString(record.Key, `${name}.Key`),
    Value: record.Value === undefined ? undefined : ensureString(record.Value, `${name}.Value`),
  };
}

function ensureSupplySidePlatformsItem(value: unknown, name: string): SupplySidePlatformsItem {
  const record = asRecord(value, name);
  return {
    Title: ensureString(record.Title, `${name}.Title`),
  };
}

function ensureInterestsItem(value: unknown, name: string): InterestsItem {
  const record = asRecord(value, name);
  return {
    InterestId: ensureInteger(record.InterestId, `${name}.InterestId`),
    ParentId: ensureNullableInteger(record.ParentId, `${name}.ParentId`),
    Name: ensureString(record.Name, `${name}.Name`),
    IsTargetable: ensureEnumValue(record.IsTargetable, `${name}.IsTargetable`, YES_NO_SET),
  };
}

function ensureAudienceCriteriaTypesItem(value: unknown, name: string): AudienceCriteriaTypesItem {
  const record = asRecord(value, name);
  return {
    Type: ensureString(record.Type, `${name}.Type`),
    BlockElement: ensureString(record.BlockElement, `${name}.BlockElement`),
    Name: ensureString(record.Name, `${name}.Name`),
    Description: ensureString(record.Description, `${name}.Description`),
    CanSelect: ensureEnumValue(record.CanSelect, `${name}.CanSelect`, CAN_SELECT_SET),
  };
}

function ensureAudienceDemographicProfilesItem(
  value: unknown,
  name: string,
): AudienceDemographicProfilesItem {
  const record = asRecord(value, name);
  return {
    Id: ensureInteger(record.Id, `${name}.Id`),
    Type: ensureString(record.Type, `${name}.Type`),
    Name: ensureString(record.Name, `${name}.Name`),
    Description: ensureString(record.Description, `${name}.Description`),
  };
}

function ensureAudienceInterestsItem(value: unknown, name: string): AudienceInterestsItem {
  const record = asRecord(value, name);
  return {
    InterestKey: ensureInteger(record.InterestKey, `${name}.InterestKey`),
    Id: ensureInteger(record.Id, `${name}.Id`),
    ParentId: ensureInteger(record.ParentId, `${name}.ParentId`),
    Name: ensureString(record.Name, `${name}.Name`),
    Description: ensureString(record.Description, `${name}.Description`),
    InterestType: ensureEnumValue(record.InterestType, `${name}.InterestType`, INTEREST_TYPE_SET),
  };
}

function ensureFilterSchemaEnumProps(value: unknown, name: string): FilterSchemaEnumProps {
  const record = asRecord(value, name);
  const valuesRecord = asRecord(record.Values, `${name}.Values`);
  return {
    Values: {
      Items: ensureArray(valuesRecord.Items, `${name}.Values.Items`).map((entry, index) =>
        ensureString(entry, `${name}.Values.Items[${index}]`)),
    },
  };
}

function ensureFilterSchemaNumberProps(value: unknown, name: string): FilterSchemaNumberProps {
  const record = asRecord(value, name);
  return {
    Min: ensureFiniteNumber(record.Min, `${name}.Min`),
    Max: ensureFiniteNumber(record.Max, `${name}.Max`),
    Precision: ensureInteger(record.Precision, `${name}.Precision`),
  };
}

function ensureFilterSchemaStringProps(value: unknown, name: string): FilterSchemaStringProps {
  const record = asRecord(value, name);
  return {
    MaxLength: ensureInteger(record.MaxLength, `${name}.MaxLength`),
    MinLength: ensureInteger(record.MinLength, `${name}.MinLength`),
  };
}

function ensureFilterSchemaOperator(value: unknown, name: string): FilterSchemaOperator {
  const record = asRecord(value, name);
  return {
    MaxItems: ensureInteger(record.MaxItems, `${name}.MaxItems`),
    Type: ensureEnumValue(record.Type, `${name}.Type`, OPERATOR_TYPE_SET),
  };
}

function ensureFilterSchemasFieldItem(value: unknown, name: string): FilterSchemasFieldItem {
  const record = asRecord(value, name);
  const type = ensureEnumValue(record.Type, `${name}.Type`, FIELD_TYPE_SET);

  const enumProps = record.EnumProps === undefined
    ? undefined
    : ensureFilterSchemaEnumProps(record.EnumProps, `${name}.EnumProps`);
  const numberProps = record.NumberProps === undefined
    ? undefined
    : ensureFilterSchemaNumberProps(record.NumberProps, `${name}.NumberProps`);
  const stringProps = record.StringProps === undefined
    ? undefined
    : ensureFilterSchemaStringProps(record.StringProps, `${name}.StringProps`);

  if (type === "Enum" && !enumProps) {
    throw new TypeError(`${name}.EnumProps is required when ${name}.Type is "Enum".`);
  }
  if (type === "Number" && !numberProps) {
    throw new TypeError(`${name}.NumberProps is required when ${name}.Type is "Number".`);
  }
  if (type === "String" && !stringProps) {
    throw new TypeError(`${name}.StringProps is required when ${name}.Type is "String".`);
  }

  return {
    Name: ensureString(record.Name, `${name}.Name`),
    Type: type,
    EnumProps: enumProps,
    NumberProps: numberProps,
    StringProps: stringProps,
    Operators: ensureArray(record.Operators, `${name}.Operators`).map((entry, index) =>
      ensureFilterSchemaOperator(entry, `${name}.Operators[${index}]`)),
  };
}

function ensureFilterSchemasItem(value: unknown, name: string): FilterSchemasItem {
  const record = asRecord(value, name);
  return {
    Name: ensureString(record.Name, `${name}.Name`),
    Fields: ensureArray(record.Fields, `${name}.Fields`).map((entry, index) =>
      ensureFilterSchemasFieldItem(entry, `${name}.Fields[${index}]`)),
  };
}

function parseDictionaryEntries<TName extends DictionaryName>(
  dictionaryName: TName,
  value: unknown,
  name: string,
): DictionariesResultMap[TName] {
  const entries = ensureArray(value, name);

  switch (dictionaryName) {
    case "Currencies":
      return entries.map((entry, index) =>
        ensureCurrenciesItem(entry, `${name}[${index}]`)) as DictionariesResultMap[TName];
    case "MetroStations":
      return entries.map((entry, index) =>
        ensureMetroStationsItem(entry, `${name}[${index}]`)) as DictionariesResultMap[TName];
    case "GeoRegions":
      return entries.map((entry, index) =>
        ensureGeoRegionsItem(entry, `${name}[${index}]`)) as DictionariesResultMap[TName];
    case "GeoRegionNames":
      return entries.map((entry, index) =>
        ensureGeoRegionNamesItem(entry, `${name}[${index}]`)) as DictionariesResultMap[TName];
    case "TimeZones":
      return entries.map((entry, index) =>
        ensureTimeZonesItem(entry, `${name}[${index}]`)) as DictionariesResultMap[TName];
    case "Constants":
      return entries.map((entry, index) =>
        ensureConstantsItem(entry, `${name}[${index}]`)) as DictionariesResultMap[TName];
    case "AdCategories":
      return entries.map((entry, index) =>
        ensureAdCategoriesItem(entry, `${name}[${index}]`)) as DictionariesResultMap[TName];
    case "OperationSystemVersions":
      return entries.map((entry, index) =>
        ensureOperationSystemVersionsItem(entry, `${name}[${index}]`)) as DictionariesResultMap[TName];
    case "ProductivityAssertions":
      return entries.map((entry, index) =>
        ensureProductivityAssertionsItem(entry, `${name}[${index}]`)) as DictionariesResultMap[TName];
    case "SupplySidePlatforms":
      return entries.map((entry, index) =>
        ensureSupplySidePlatformsItem(entry, `${name}[${index}]`)) as DictionariesResultMap[TName];
    case "Interests":
      return entries.map((entry, index) =>
        ensureInterestsItem(entry, `${name}[${index}]`)) as DictionariesResultMap[TName];
    case "AudienceCriteriaTypes":
      return entries.map((entry, index) =>
        ensureAudienceCriteriaTypesItem(entry, `${name}[${index}]`)) as DictionariesResultMap[TName];
    case "AudienceDemographicProfiles":
      return entries.map((entry, index) =>
        ensureAudienceDemographicProfilesItem(
          entry,
          `${name}[${index}]`,
        )) as DictionariesResultMap[TName];
    case "AudienceInterests":
      return entries.map((entry, index) =>
        ensureAudienceInterestsItem(entry, `${name}[${index}]`)) as DictionariesResultMap[TName];
    case "FilterSchemas":
      return entries.map((entry, index) =>
        ensureFilterSchemasItem(entry, `${name}[${index}]`)) as DictionariesResultMap[TName];
    default: {
      const neverName: never = dictionaryName;
      throw new TypeError(`Unsupported dictionary name: ${String(neverName)}`);
    }
  }
}

function ensureGetRequest<TName extends DictionaryName>(
  value: DictionariesGetRequest<TName>,
): DictionariesGetRequest<TName> {
  const record = asRecord(value, "params");
  const dictionaryNames = ensureDictionaryNames(
    record.DictionaryNames,
    "params.DictionaryNames",
  ) as TName[];

  return {
    DictionaryNames: dictionaryNames,
  };
}

function ensureParsedResultForNames<TName extends DictionaryName>(
  value: unknown,
  requestedNames: readonly TName[],
  name: string,
): Pick<DictionariesResultMap, TName> {
  const record = asRecord(value, name);
  const parsed: Partial<Pick<DictionariesResultMap, TName>> = {};

  for (const dictionaryName of requestedNames) {
    const rawDictionary = record[dictionaryName];
    if (rawDictionary === undefined) {
      if (dictionaryName === "ProductivityAssertions") {
        parsed[dictionaryName] = [] as Pick<DictionariesResultMap, TName>[TName];
        continue;
      }
      throw new TypeError(`${name}.${dictionaryName} is missing in API response.`);
    }

    parsed[dictionaryName] = parseDictionaryEntries(
      dictionaryName,
      rawDictionary,
      `${name}.${dictionaryName}`,
    ) as Pick<DictionariesResultMap, TName>[TName];
  }

  return parsed as Pick<DictionariesResultMap, TName>;
}

function mergeResultByNames<TName extends DictionaryName>(
  requestedNames: readonly TName[],
  parsedByName: Partial<Pick<DictionariesResultMap, TName>>,
): Pick<DictionariesResultMap, TName> {
  const merged: Partial<Pick<DictionariesResultMap, TName>> = {};
  for (const dictionaryName of requestedNames) {
    const dictionaryEntries = parsedByName[dictionaryName];
    if (dictionaryEntries === undefined) {
      throw new TypeError(`Dictionary "${dictionaryName}" is missing after parsing.`);
    }
    merged[dictionaryName] = dictionaryEntries;
  }
  return merged as Pick<DictionariesResultMap, TName>;
}

function withDefaultIdempotency(options: DictionariesGetOptions): RequestOptions {
  const { useCache: _unusedUseCache, ...rest } = options;
  return {
    ...rest,
    idempotent: rest.idempotent ?? true,
  };
}

function cacheHitMetadata(): TransportMetadata {
  return {
    status: 200,
    headers: {},
  };
}

export class DictionariesService {
  constructor(
    private readonly transport: YandexDirectTransport,
    private readonly options: DictionariesServiceOptions = {},
  ) {}

  async get<TName extends DictionaryName>(
    params: DictionariesGetRequest<TName>,
    options: DictionariesGetOptions = {},
  ): Promise<TransportResponse<JsonEnvelope<Pick<DictionariesResultMap, TName>>>> {
    const validated = ensureGetRequest(params);
    const requestedNames = validated.DictionaryNames;
    const parsedByName: Partial<Pick<DictionariesResultMap, TName>> = {};

    const cacheStrategy = options.useCache ? this.options.cacheStrategy : undefined;
    const missingNames: TName[] = [];

    if (cacheStrategy?.get) {
      for (const dictionaryName of requestedNames) {
        const cached = await cacheStrategy.get(dictionaryName);
        if (cached === undefined) {
          missingNames.push(dictionaryName);
          continue;
        }
        parsedByName[dictionaryName] = parseDictionaryEntries(
          dictionaryName,
          cached,
          `cache.${dictionaryName}`,
        ) as Pick<DictionariesResultMap, TName>[TName];
      }
    } else {
      missingNames.push(...requestedNames);
    }

    let responseFromApi: TransportResponse<JsonEnvelope<Partial<Pick<DictionariesResultMap, TName>>>> | undefined;
    if (missingNames.length > 0) {
      const body: JsonRpcRequestEnvelope<"get", DictionariesGetRequest<TName>> = {
        method: "get",
        params: {
          DictionaryNames: missingNames,
        },
      };

      responseFromApi = await this.transport.requestService<Partial<Pick<DictionariesResultMap, TName>>>(
        DICTIONARIES_SERVICE,
        body,
        withDefaultIdempotency(options),
      );

      const envelope = asRecord(responseFromApi.data, "response");
      const parsedFromApi = ensureParsedResultForNames(
        envelope.result,
        missingNames,
        "response.result",
      );

      for (const dictionaryName of missingNames) {
        parsedByName[dictionaryName] = parsedFromApi[dictionaryName];
      }

      if (cacheStrategy?.set) {
        for (const dictionaryName of missingNames) {
          await cacheStrategy.set(dictionaryName, parsedFromApi[dictionaryName]);
        }
      }
    }

    const mergedResult = mergeResultByNames(requestedNames, parsedByName);

    if (!responseFromApi) {
      return {
        data: {
          result: mergedResult,
        },
        metadata: cacheHitMetadata(),
      };
    }

    return {
      data: {
        ...(responseFromApi.data as Record<string, unknown>),
        result: mergedResult,
      } as JsonEnvelope<Pick<DictionariesResultMap, TName>>,
      metadata: responseFromApi.metadata,
    };
  }
}
