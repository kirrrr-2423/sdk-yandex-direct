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

export const SUPPORTED_AD_FORMAT_KEYS = [
  "TextAd",
  "DynamicTextAd",
  "MobileAppAd",
  "TextImageAd",
  "MobileAppImageAd",
  "TextAdBuilderAd",
  "MobileAppAdBuilderAd",
  "MobileAppCpcVideoAdBuilderAd",
  "CpmBannerAdBuilderAd",
  "CpcVideoAdBuilderAd",
  "CpmVideoAdBuilderAd",
  "SmartAdBuilderAd",
  "ShoppingAd",
  "ListingAd",
] as const;
export type SupportedAdFormatKey = (typeof SUPPORTED_AD_FORMAT_KEYS)[number];

export const LEGACY_OR_UNKNOWN_AD_FORMAT_KEYS = [
  "MobileAppCpcVideoAd",
  "SmartAd",
  "PerformanceAd",
] as const;

type ExtensibleLiteral<T extends string> = T | (string & {});

export type AdState = ExtensibleLiteral<"OFF" | "ON" | "SUSPENDED">;
export type AdStatus = ExtensibleLiteral<"ACCEPTED" | "DRAFT" | "MODERATION" | "PREACCEPTED" | "REJECTED">;
export type AdType = ExtensibleLiteral<
  | "TEXT_AD"
  | "SMART_AD"
  | "MOBILE_APP_AD"
  | "DYNAMIC_TEXT_AD"
  | "IMAGE_AD"
  | "CPC_VIDEO_AD"
  | "CPM_BANNER_AD"
  | "CPM_VIDEO_AD"
  | "SHOPPING_AD"
  | "LISTING_AD"
>;

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

export type DynamicTextAdFieldName = ExtensibleLiteral<
  "Title"
  | "Title2"
  | "Text"
  | "VCardId"
  | "SitelinkSetId"
  | "AdExtensionIds"
  | "TextTemplate"
  | "Href"
  | "DisplayUrlPath"
>;

export type TextImageAdFieldName = ExtensibleLiteral<
  "Href"
  | "DisplayUrlPath"
  | "VCardId"
  | "SitelinkSetId"
  | "AdExtensionIds"
  | "AdImageHash"
>;

export type MobileAppImageAdFieldName = ExtensibleLiteral<
  "TrackingUrl"
  | "AdImageHash"
  | "AdImageMod"
  | "AppIconMod"
>;

export type TextAdBuilderAdFieldName = ExtensibleLiteral<
  "Href"
  | "DisplayUrlPath"
  | "Creative"
  | "VCardId"
  | "SitelinkSetId"
  | "AdExtensionIds"
>;

export type MobileAppAdBuilderAdFieldName = ExtensibleLiteral<
  "Creative"
  | "TrackingUrl"
  | "ImpressionUrl"
  | "AppIconMod"
>;

export type MobileAppCpcVideoAdBuilderAdFieldName = ExtensibleLiteral<
  "Creative"
  | "TrackingUrl"
  | "ImpressionUrl"
  | "AppIconMod"
>;

export type CpcVideoAdBuilderAdFieldName = ExtensibleLiteral<
  "Href"
  | "DisplayUrlPath"
  | "Creative"
  | "VCardId"
  | "SitelinkSetId"
  | "AdExtensionIds"
>;

export type CpmBannerAdBuilderAdFieldName = ExtensibleLiteral<
  "Href"
  | "Creative"
  | "AdImageHash"
  | "TurboPageId"
  | "Pixels"
>;

export type CpmVideoAdBuilderAdFieldName = ExtensibleLiteral<
  "Href"
  | "Creative"
  | "TurboPageId"
  | "ImpressionUrl"
>;

export type SmartAdBuilderAdFieldName = ExtensibleLiteral<
  "Creative"
  | "BusinessType"
>;

export type ShoppingAdFieldName = ExtensibleLiteral<
  "OfferId"
  | "FeedId"
  | "FeedCategoryId"
  | "BusinessType"
>;

export type ListingAdFieldName = ExtensibleLiteral<
  "FeedId"
  | "FeedCategoryId"
  | "BusinessType"
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

export type DynamicTextAdPayload = Record<string, unknown>;
export type TextImageAdPayload = Record<string, unknown>;
export type MobileAppImageAdPayload = Record<string, unknown>;
export type TextAdBuilderAdPayload = Record<string, unknown>;
export type MobileAppAdBuilderAdPayload = Record<string, unknown>;
export type MobileAppCpcVideoAdBuilderAdPayload = Record<string, unknown>;
export type CpmBannerAdBuilderAdPayload = Record<string, unknown>;
export type CpcVideoAdBuilderAdPayload = Record<string, unknown>;
export type CpmVideoAdBuilderAdPayload = Record<string, unknown>;
export type SmartAdBuilderAdPayload = Record<string, unknown>;
export type ShoppingAdPayload = Record<string, unknown>;
export type ListingAdPayload = Record<string, unknown>;

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

export interface DynamicTextAdGet extends AdGetBase {
  Type?: ExtensibleLiteral<"DYNAMIC_TEXT_AD">;
  DynamicTextAd: DynamicTextAdPayload;
}

export interface TextImageAdGet extends AdGetBase {
  Type?: ExtensibleLiteral<"IMAGE_AD">;
  TextImageAd: TextImageAdPayload;
}

export interface MobileAppImageAdGet extends AdGetBase {
  Type?: ExtensibleLiteral<"IMAGE_AD">;
  MobileAppImageAd: MobileAppImageAdPayload;
}

export interface TextAdBuilderAdGet extends AdGetBase {
  Type?: ExtensibleLiteral<"IMAGE_AD">;
  TextAdBuilderAd: TextAdBuilderAdPayload;
}

export interface MobileAppAdBuilderAdGet extends AdGetBase {
  Type?: ExtensibleLiteral<"IMAGE_AD">;
  MobileAppAdBuilderAd: MobileAppAdBuilderAdPayload;
}

export interface MobileAppCpcVideoAdBuilderAdGet extends AdGetBase {
  Type?: ExtensibleLiteral<"CPC_VIDEO_AD">;
  MobileAppCpcVideoAdBuilderAd: MobileAppCpcVideoAdBuilderAdPayload;
}

export interface CpmBannerAdBuilderAdGet extends AdGetBase {
  Type?: ExtensibleLiteral<"CPM_BANNER_AD">;
  CpmBannerAdBuilderAd: CpmBannerAdBuilderAdPayload;
}

export interface CpcVideoAdBuilderAdGet extends AdGetBase {
  Type?: ExtensibleLiteral<"CPC_VIDEO_AD">;
  CpcVideoAdBuilderAd: CpcVideoAdBuilderAdPayload;
}

export interface CpmVideoAdBuilderAdGet extends AdGetBase {
  Type?: ExtensibleLiteral<"CPM_VIDEO_AD">;
  CpmVideoAdBuilderAd: CpmVideoAdBuilderAdPayload;
}

export interface SmartAdBuilderAdGet extends AdGetBase {
  Type?: ExtensibleLiteral<"SMART_AD">;
  SmartAdBuilderAd: SmartAdBuilderAdPayload;
}

export interface ShoppingAdGet extends AdGetBase {
  Type?: ExtensibleLiteral<"SHOPPING_AD">;
  ShoppingAd: ShoppingAdPayload;
}

export interface ListingAdGet extends AdGetBase {
  Type?: ExtensibleLiteral<"LISTING_AD">;
  ListingAd: ListingAdPayload;
}

export type SupportedAdGet =
  | TextAdGet
  | MobileAppAdGet
  | DynamicTextAdGet
  | TextImageAdGet
  | MobileAppImageAdGet
  | TextAdBuilderAdGet
  | MobileAppAdBuilderAdGet
  | MobileAppCpcVideoAdBuilderAdGet
  | CpmBannerAdBuilderAdGet
  | CpcVideoAdBuilderAdGet
  | CpmVideoAdBuilderAdGet
  | SmartAdBuilderAdGet
  | ShoppingAdGet
  | ListingAdGet;

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

export interface DynamicTextAdAdd extends AdAddBase {
  DynamicTextAd: DynamicTextAdPayload;
}

export interface TextImageAdAdd extends AdAddBase {
  TextImageAd: TextImageAdPayload;
}

export interface MobileAppImageAdAdd extends AdAddBase {
  MobileAppImageAd: MobileAppImageAdPayload;
}

export interface TextAdBuilderAdAdd extends AdAddBase {
  TextAdBuilderAd: TextAdBuilderAdPayload;
}

export interface MobileAppAdBuilderAdAdd extends AdAddBase {
  MobileAppAdBuilderAd: MobileAppAdBuilderAdPayload;
}

export interface MobileAppCpcVideoAdBuilderAdAdd extends AdAddBase {
  MobileAppCpcVideoAdBuilderAd: MobileAppCpcVideoAdBuilderAdPayload;
}

export interface CpmBannerAdBuilderAdAdd extends AdAddBase {
  CpmBannerAdBuilderAd: CpmBannerAdBuilderAdPayload;
}

export interface CpcVideoAdBuilderAdAdd extends AdAddBase {
  CpcVideoAdBuilderAd: CpcVideoAdBuilderAdPayload;
}

export interface CpmVideoAdBuilderAdAdd extends AdAddBase {
  CpmVideoAdBuilderAd: CpmVideoAdBuilderAdPayload;
}

export interface SmartAdBuilderAdAdd extends AdAddBase {
  SmartAdBuilderAd: SmartAdBuilderAdPayload;
}

export interface ShoppingAdAdd extends AdAddBase {
  ShoppingAd: ShoppingAdPayload;
}

export interface ListingAdAdd extends AdAddBase {
  ListingAd: ListingAdPayload;
}

export type SupportedAdAdd =
  | TextAdAdd
  | MobileAppAdAdd
  | DynamicTextAdAdd
  | TextImageAdAdd
  | MobileAppImageAdAdd
  | TextAdBuilderAdAdd
  | MobileAppAdBuilderAdAdd
  | MobileAppCpcVideoAdBuilderAdAdd
  | CpmBannerAdBuilderAdAdd
  | CpcVideoAdBuilderAdAdd
  | CpmVideoAdBuilderAdAdd
  | SmartAdBuilderAdAdd
  | ShoppingAdAdd
  | ListingAdAdd;

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

export interface DynamicTextAdUpdate extends AdUpdateBase {
  DynamicTextAd: DynamicTextAdPayload;
}

export interface TextImageAdUpdate extends AdUpdateBase {
  TextImageAd: TextImageAdPayload;
}

export interface MobileAppImageAdUpdate extends AdUpdateBase {
  MobileAppImageAd: MobileAppImageAdPayload;
}

export interface TextAdBuilderAdUpdate extends AdUpdateBase {
  TextAdBuilderAd: TextAdBuilderAdPayload;
}

export interface MobileAppAdBuilderAdUpdate extends AdUpdateBase {
  MobileAppAdBuilderAd: MobileAppAdBuilderAdPayload;
}

export interface MobileAppCpcVideoAdBuilderAdUpdate extends AdUpdateBase {
  MobileAppCpcVideoAdBuilderAd: MobileAppCpcVideoAdBuilderAdPayload;
}

export interface CpmBannerAdBuilderAdUpdate extends AdUpdateBase {
  CpmBannerAdBuilderAd: CpmBannerAdBuilderAdPayload;
}

export interface CpcVideoAdBuilderAdUpdate extends AdUpdateBase {
  CpcVideoAdBuilderAd: CpcVideoAdBuilderAdPayload;
}

export interface CpmVideoAdBuilderAdUpdate extends AdUpdateBase {
  CpmVideoAdBuilderAd: CpmVideoAdBuilderAdPayload;
}

export interface SmartAdBuilderAdUpdate extends AdUpdateBase {
  SmartAdBuilderAd: SmartAdBuilderAdPayload;
}

export interface ShoppingAdUpdate extends AdUpdateBase {
  ShoppingAd: ShoppingAdPayload;
}

export interface ListingAdUpdate extends AdUpdateBase {
  ListingAd: ListingAdPayload;
}

export type SupportedAdUpdate =
  | TextAdUpdate
  | MobileAppAdUpdate
  | DynamicTextAdUpdate
  | TextImageAdUpdate
  | MobileAppImageAdUpdate
  | TextAdBuilderAdUpdate
  | MobileAppAdBuilderAdUpdate
  | MobileAppCpcVideoAdBuilderAdUpdate
  | CpmBannerAdBuilderAdUpdate
  | CpcVideoAdBuilderAdUpdate
  | CpmVideoAdBuilderAdUpdate
  | SmartAdBuilderAdUpdate
  | ShoppingAdUpdate
  | ListingAdUpdate;

export interface AdsGetRequest extends GetMethodParams<AdsFieldName, AdsSelectionCriteria> {
  TextAdFieldNames?: FieldNames<TextAdFieldName>;
  MobileAppAdFieldNames?: FieldNames<MobileAppAdFieldName>;
  DynamicTextAdFieldNames?: FieldNames<DynamicTextAdFieldName>;
  TextImageAdFieldNames?: FieldNames<TextImageAdFieldName>;
  MobileAppImageAdFieldNames?: FieldNames<MobileAppImageAdFieldName>;
  TextAdBuilderAdFieldNames?: FieldNames<TextAdBuilderAdFieldName>;
  MobileAppAdBuilderAdFieldNames?: FieldNames<MobileAppAdBuilderAdFieldName>;
  MobileAppCpcVideoAdBuilderAdFieldNames?: FieldNames<MobileAppCpcVideoAdBuilderAdFieldName>;
  CpmBannerAdBuilderAdFieldNames?: FieldNames<CpmBannerAdBuilderAdFieldName>;
  CpcVideoAdBuilderAdFieldNames?: FieldNames<CpcVideoAdBuilderAdFieldName>;
  CpmVideoAdBuilderAdFieldNames?: FieldNames<CpmVideoAdBuilderAdFieldName>;
  SmartAdBuilderAdFieldNames?: FieldNames<SmartAdBuilderAdFieldName>;
  ShoppingAdFieldNames?: FieldNames<ShoppingAdFieldName>;
  ListingAdFieldNames?: FieldNames<ListingAdFieldName>;
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
