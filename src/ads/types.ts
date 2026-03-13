import type {
  AddMutationResult,
  DeleteMutationResult,
  FieldNames,
  GetMethodParams,
  MutationItemResult,
  SelectionCriteriaBase,
  UpdateMutationResult,
  YandexDirectId,
} from "../shared/contracts.js";

export const SUPPORTED_AD_FORMAT_KEYS = ["TextAd", "MobileAppAd"] as const;
export type SupportedAdFormatKey = (typeof SUPPORTED_AD_FORMAT_KEYS)[number];

export const KNOWN_UNSUPPORTED_AD_FORMAT_KEYS = [
  "DynamicTextAd",
  "TextImageAd",
  "MobileAppCpcVideoAd",
  "CpcVideoAdBuilderAd",
  "CpmBannerAdBuilderAd",
  "CpmVideoAdBuilderAd",
  "SmartAd",
  "PerformanceAd",
] as const;

type ExtensibleLiteral<T extends string> = T | (string & {});

export type AdState = ExtensibleLiteral<"OFF" | "ON" | "SUSPENDED">;
export type AdStatus = ExtensibleLiteral<"ACCEPTED" | "DRAFT" | "MODERATION" | "PREACCEPTED" | "REJECTED">;
export type AdType = ExtensibleLiteral<"TEXT_AD" | "MOBILE_APP_AD">;

export interface AdsSelectionCriteria extends SelectionCriteriaBase {
  CampaignIds?: readonly YandexDirectId[];
  AdGroupIds?: readonly YandexDirectId[];
  States?: readonly AdState[];
  Statuses?: readonly AdStatus[];
  Types?: readonly AdType[];
}

export type AdsFieldName = ExtensibleLiteral<
  "Id"
  | "CampaignId"
  | "AdGroupId"
  | "Status"
  | "State"
  | "StatusClarification"
  | "Type"
  | "Subtype"
  | "ServingStatus"
>;

export type TextAdFieldName = ExtensibleLiteral<
  "Title"
  | "Title2"
  | "Text"
  | "Href"
  | "DisplayUrlPath"
  | "Mobile"
  | "VCardId"
  | "SitelinkSetId"
  | "AdExtensionIds"
>;

export type MobileAppAdFieldName = ExtensibleLiteral<
  "Title"
  | "Text"
  | "StoreUrl"
  | "TrackingUrl"
  | "ImpressionUrl"
  | "Action"
  | "AdImageHash"
  | "AdImageMod"
  | "AppIconMod"
>;

export interface TextAdPayload {
  Title?: string;
  Title2?: string;
  Text?: string;
  Href?: string;
  Mobile?: ExtensibleLiteral<"YES" | "NO">;
  DisplayUrlPath?: string;
  VCardId?: YandexDirectId;
  SitelinkSetId?: YandexDirectId;
  AdExtensionIds?: readonly YandexDirectId[];
  [key: string]: unknown;
}

export interface MobileAppAdPayload {
  Title?: string;
  Text?: string;
  StoreUrl?: string;
  TrackingUrl?: string;
  ImpressionUrl?: string;
  Action?: string;
  AdImageHash?: string;
  AdImageMod?: string;
  AppIconMod?: string;
  [key: string]: unknown;
}

export interface AdGetBase {
  Id: YandexDirectId;
  CampaignId?: YandexDirectId;
  AdGroupId?: YandexDirectId;
  Status?: AdStatus;
  State?: AdState;
  StatusClarification?: string;
  Type?: AdType;
  [key: string]: unknown;
}

export interface TextAdGet extends AdGetBase {
  Type?: ExtensibleLiteral<"TEXT_AD">;
  TextAd: TextAdPayload;
  MobileAppAd?: never;
}

export interface MobileAppAdGet extends AdGetBase {
  Type?: ExtensibleLiteral<"MOBILE_APP_AD">;
  MobileAppAd: MobileAppAdPayload;
  TextAd?: never;
}

export type SupportedAdGet = TextAdGet | MobileAppAdGet;

export interface AdAddBase {
  AdGroupId: YandexDirectId;
  [key: string]: unknown;
}

export interface TextAdAdd extends AdAddBase {
  TextAd: TextAdPayload;
  MobileAppAd?: never;
}

export interface MobileAppAdAdd extends AdAddBase {
  MobileAppAd: MobileAppAdPayload;
  TextAd?: never;
}

export type SupportedAdAdd = TextAdAdd | MobileAppAdAdd;

export interface AdUpdateBase {
  Id: YandexDirectId;
  [key: string]: unknown;
}

export interface TextAdUpdate extends AdUpdateBase {
  TextAd: TextAdPayload;
  MobileAppAd?: never;
}

export interface MobileAppAdUpdate extends AdUpdateBase {
  MobileAppAd: MobileAppAdPayload;
  TextAd?: never;
}

export type SupportedAdUpdate = TextAdUpdate | MobileAppAdUpdate;

export interface AdsGetRequest extends GetMethodParams<AdsFieldName, AdsSelectionCriteria> {
  TextAdFieldNames?: FieldNames<TextAdFieldName>;
  MobileAppAdFieldNames?: FieldNames<MobileAppAdFieldName>;
}

export interface AdsGetResult {
  Ads: SupportedAdGet[];
  LimitedBy?: number;
  [key: string]: unknown;
}

export interface AdsAddRequest {
  Ads: readonly SupportedAdAdd[];
}

export type AdsAddResult = AddMutationResult;

export interface AdsUpdateRequest {
  Ads: readonly SupportedAdUpdate[];
}

export type AdsUpdateResult = UpdateMutationResult;

export interface AdsSuspendRequest {
  SelectionCriteria: AdsSelectionCriteria;
}

export interface AdsSuspendResult {
  SuspendResults: MutationItemResult[];
}

export interface AdsResumeRequest {
  SelectionCriteria: AdsSelectionCriteria;
}

export interface AdsResumeResult {
  ResumeResults: MutationItemResult[];
}

export interface AdsDeleteRequest {
  SelectionCriteria: AdsSelectionCriteria;
}

export type AdsDeleteResult = DeleteMutationResult;

export interface AdsArchiveRequest {
  SelectionCriteria: AdsSelectionCriteria;
}

export interface AdsArchiveResult {
  ArchiveResults: MutationItemResult[];
}

export interface AdsUnarchiveRequest {
  SelectionCriteria: AdsSelectionCriteria;
}

export interface AdsUnarchiveResult {
  UnarchiveResults: MutationItemResult[];
}

export interface AdsModerateRequest {
  SelectionCriteria: AdsSelectionCriteria;
}

export interface AdsModerateResult {
  ModerateResults: MutationItemResult[];
}
