import type {
  AddMutationResult,
  DeleteMutationResult,
  FieldNames,
  GetMethodParams,
  SelectionCriteriaBase,
  UpdateMutationResult,
  YandexDirectId,
  YandexDirectIds,
} from "../shared/contracts.js";

type ExtensibleLiteral<T extends string> = T | (string & {});

export type BidModifierLevel = ExtensibleLiteral<"CAMPAIGN" | "AD_GROUP">;
export type BidModifierType = ExtensibleLiteral<
  | "MOBILE_ADJUSTMENT"
  | "TABLET_ADJUSTMENT"
  | "DESKTOP_ADJUSTMENT"
  | "DEMOGRAPHIC_ADJUSTMENT"
  | "RETARGETING_ADJUSTMENT"
  | "REGIONAL_ADJUSTMENT"
  | "VIDEO_ADJUSTMENT"
  | "SMART_ADJUSTMENT"
  | "SERP_LAYOUT_ADJUSTMENT"
  | "INCOME_GRADE_ADJUSTMENT"
  | "WEATHER_ADJUSTMENT"
>;

export interface BidModifiersSelectionCriteria extends SelectionCriteriaBase {
  CampaignIds?: YandexDirectIds;
  AdGroupIds?: YandexDirectIds;
  Levels?: readonly BidModifierLevel[];
  Types?: readonly BidModifierType[];
}

export type BidModifierFieldName = ExtensibleLiteral<
  "CampaignId" | "AdGroupId" | "Level" | "BidModifierId" | "Type"
>;

export interface BidModifiersGetRequest extends GetMethodParams<BidModifierFieldName, BidModifiersSelectionCriteria> {
  FieldNames: FieldNames<BidModifierFieldName>;
}

export interface BidModifierGetItem {
  BidModifierId?: YandexDirectId;
  CampaignId?: YandexDirectId;
  AdGroupId?: YandexDirectId;
  Level?: BidModifierLevel;
  Type?: BidModifierType;
  [key: string]: unknown;
}

export interface BidModifiersGetResult {
  BidModifiers: BidModifierGetItem[];
  LimitedBy?: number;
}

export interface BidModifierAddItem {
  CampaignId?: YandexDirectId;
  AdGroupId?: YandexDirectId;
  [key: string]: unknown;
}

export interface BidModifiersAddRequest {
  BidModifiers: readonly BidModifierAddItem[];
}

export type BidModifiersAddResult = AddMutationResult;

export interface BidModifierSetItem {
  BidModifierId?: YandexDirectId;
  CampaignId?: YandexDirectId;
  AdGroupId?: YandexDirectId;
  [key: string]: unknown;
}

export interface BidModifiersSetRequest {
  BidModifiers: readonly BidModifierSetItem[];
}

export type BidModifiersSetResult = UpdateMutationResult;

export interface BidModifiersDeleteRequest {
  SelectionCriteria: {
    Ids: YandexDirectIds;
  };
}

export type BidModifiersDeleteResult = DeleteMutationResult;
