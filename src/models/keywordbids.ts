import type {
  FieldNames,
  YandexDirectId,
  YandexDirectIds,
} from "../shared/contracts.js";

type ExtensibleLiteral<T extends string> = T | (string & {});

export type AuctionBidFieldName = ExtensibleLiteral<
  | "KeywordId"
  | "AdGroupId"
  | "CampaignId"
  | "ServingStatus"
  | "SearchPrices"
  | "IsSuspended"
  | "SearchBid"
  | "ContextBid"
  | "MinSearchPrice"
  | "CurrentSearchPrice"
  | "AuctionBids"
  | "AutoBudgetPriority"
>;

export interface KeywordBidsSelectionCriteria {
  KeywordIds?: YandexDirectIds;
  AdGroupIds?: YandexDirectIds;
  CampaignIds?: YandexDirectIds;
}

export interface KeywordBidsGetRequest {
  SelectionCriteria: KeywordBidsSelectionCriteria;
  FieldNames: FieldNames<AuctionBidFieldName>;
  Page?: {
    Limit: number;
    Offset?: number;
  };
}

export interface KeywordBidGetItem {
  KeywordId?: YandexDirectId;
  AdGroupId?: YandexDirectId;
  CampaignId?: YandexDirectId;
  ServingStatus?: string;
  SearchBid?: number;
  ContextBid?: number;
  [key: string]: unknown;
}

export interface KeywordBidsGetResult {
  KeywordBids: KeywordBidGetItem[];
  LimitedBy?: number;
}

export interface KeywordBidSetItem {
  KeywordId?: YandexDirectId;
  AdGroupId?: YandexDirectId;
  CampaignId?: YandexDirectId;
  SearchBid?: number;
  ContextBid?: number;
  StrategyPriority?: string;
  [key: string]: unknown;
}

export interface KeywordBidsSetRequest {
  KeywordBids: readonly KeywordBidSetItem[];
}

export interface KeywordBidSetResultItem {
  KeywordId?: YandexDirectId;
  Warnings?: Array<{ Code?: number; Message?: string; Details?: string }>;
  Errors?: Array<{ Code?: number; Message?: string; Details?: string }>;
}

export interface KeywordBidsSetResult {
  SetResults: KeywordBidSetResultItem[];
}

export interface KeywordBidSetAutoItem {
  AdGroupId?: YandexDirectId;
  CampaignId?: YandexDirectId;
  Value: number;
  GoalId?: YandexDirectId;
  Priority?: string;
  [key: string]: unknown;
}

export interface KeywordBidsSetAutoRequest {
  KeywordBids: readonly KeywordBidSetAutoItem[];
}

export interface KeywordBidsSetAutoResult {
  SetAutoResults: KeywordBidSetResultItem[];
}
