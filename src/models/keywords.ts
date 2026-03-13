import type {
  AddMutationResult,
  DeleteMutationResult,
  FieldNames,
  GetMethodParams,
  SelectionCriteriaBase,
  StateTransitionMutationResult,
  UpdateMutationResult,
  YandexDirectId,
  YandexDirectIds,
} from "../shared/contracts.js";

type ExtensibleLiteral<T extends string> = T | (string & {});

export type KeywordStrategyPriority = ExtensibleLiteral<"LOW" | "NORMAL" | "HIGH" | "HIGHEST" | "LOWEST">;

export interface KeywordsSelectionCriteria extends SelectionCriteriaBase {
  Ids?: YandexDirectIds;
  AdGroupIds?: YandexDirectIds;
  CampaignIds?: YandexDirectIds;
  States?: readonly string[];
}

export type KeywordFieldName = ExtensibleLiteral<
  | "Id"
  | "AdGroupId"
  | "CampaignId"
  | "Keyword"
  | "UserParam1"
  | "UserParam2"
  | "Bid"
  | "ContextBid"
  | "StrategyPriority"
  | "State"
  | "Status"
  | "ServingStatus"
  | "ProductivityAssertions"
  | "AutotargetingCategories"
  | "AutotargetingSettings"
>;

export interface KeywordsGetRequest extends GetMethodParams<KeywordFieldName, KeywordsSelectionCriteria> {
  FieldNames: FieldNames<KeywordFieldName>;
}

export interface KeywordGetItem {
  Id?: YandexDirectId;
  AdGroupId?: YandexDirectId;
  CampaignId?: YandexDirectId;
  Keyword?: string;
  UserParam1?: string | null;
  UserParam2?: string | null;
  Bid?: number;
  ContextBid?: number;
  StrategyPriority?: KeywordStrategyPriority | null;
  State?: string;
  Status?: string;
  ServingStatus?: string;
  [key: string]: unknown;
}

export interface KeywordsGetResult {
  Keywords: KeywordGetItem[];
  LimitedBy?: number;
}

export interface KeywordAddItem {
  Keyword: string;
  AdGroupId: YandexDirectId;
  Bid?: number;
  ContextBid?: number;
  UserParam1?: string | null;
  UserParam2?: string | null;
  StrategyPriority?: KeywordStrategyPriority | null;
  [key: string]: unknown;
}

export interface KeywordsAddRequest {
  Keywords: readonly KeywordAddItem[];
}

export type KeywordsAddResult = AddMutationResult;

export interface KeywordUpdateItem {
  Id: YandexDirectId;
  Keyword?: string;
  Bid?: number;
  ContextBid?: number;
  UserParam1?: string | null;
  UserParam2?: string | null;
  StrategyPriority?: KeywordStrategyPriority | null;
  [key: string]: unknown;
}

export interface KeywordsUpdateRequest {
  Keywords: readonly KeywordUpdateItem[];
}

export type KeywordsUpdateResult = UpdateMutationResult;

export interface KeywordsDeleteRequest {
  SelectionCriteria: {
    Ids: YandexDirectIds;
  };
}

export type KeywordsDeleteResult = DeleteMutationResult;

export interface KeywordsStateRequest {
  SelectionCriteria: {
    Ids: YandexDirectIds;
  };
}

export type KeywordsSuspendResult = StateTransitionMutationResult<"SuspendResults">;
export type KeywordsResumeResult = StateTransitionMutationResult<"ResumeResults">;
