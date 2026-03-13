import type {
  AddMutationResult,
  DeleteMutationResult,
  FieldNames,
  GetMethodParams,
  SelectionCriteriaBase,
  YandexDirectId,
  YandexDirectIds,
} from "../shared/contracts.js";

type ExtensibleLiteral<T extends string> = T | (string & {});

export interface SitelinksSelectionCriteria extends SelectionCriteriaBase {
  Ids?: YandexDirectIds;
}

export type SitelinkSetFieldName = ExtensibleLiteral<"Id" | "Sitelinks">;

export interface SitelinksGetRequest extends GetMethodParams<SitelinkSetFieldName, SitelinksSelectionCriteria> {
  FieldNames: FieldNames<SitelinkSetFieldName>;
}

export interface SitelinkItem {
  Title: string;
  Href?: string;
  Description?: string;
  [key: string]: unknown;
}

export interface SitelinkSetGetItem {
  Id?: YandexDirectId;
  Sitelinks?: SitelinkItem[];
  [key: string]: unknown;
}

export interface SitelinksGetResult {
  SitelinksSets: SitelinkSetGetItem[];
  LimitedBy?: number;
}

export interface SitelinksAddItem {
  Sitelinks: readonly SitelinkItem[];
}

export interface SitelinksAddRequest {
  SitelinksSets: readonly SitelinksAddItem[];
}

export type SitelinksAddResult = AddMutationResult;

export interface SitelinksDeleteRequest {
  SelectionCriteria: {
    Ids: YandexDirectIds;
  };
}

export type SitelinksDeleteResult = DeleteMutationResult;
