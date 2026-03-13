import type {
  AddMutationResult,
  DeleteMutationResult,
  FieldNames,
  GetMethodParams,
  SelectionCriteriaBase,
  StateTransitionMutationResult,
  UpdateMutationResult,
  YandexDirectId,
} from "../shared/contracts.js";

export type CampaignType =
  | "TEXT_CAMPAIGN"
  | "MOBILE_APP_CAMPAIGN"
  | "DYNAMIC_TEXT_CAMPAIGN"
  | "CPM_BANNER_CAMPAIGN"
  | "CPM_DEALS_CAMPAIGN"
  | "CPM_FRONTPAGE_CAMPAIGN"
  | "CPM_PRICE"
  | "MCBANNER_CAMPAIGN"
  | "SMART_CAMPAIGN"
  | "UNIFIED_CAMPAIGN"
  | (string & {});

export type CampaignState = "ON" | "OFF" | "SUSPENDED" | "ENDED" | (string & {});
export type CampaignStatus = "ACCEPTED" | "DRAFT" | "MODERATION" | "REJECTED" | (string & {});

export interface CampaignsSelectionCriteria extends SelectionCriteriaBase {
  Ids?: readonly YandexDirectId[];
  Types?: readonly CampaignType[];
  States?: readonly CampaignState[];
  Statuses?: readonly CampaignStatus[];
}

export type CampaignFieldName =
  | "Id"
  | "Name"
  | "Type"
  | "State"
  | "Status"
  | "StartDate"
  | "DailyBudget"
  | "StatusPayment"
  | (string & {});

export type TextCampaignFieldName =
  | "BiddingStrategy"
  | "RelevantKeywords"
  | "Settings"
  | (string & {});

export type MobileAppCampaignFieldName =
  | "BiddingStrategy"
  | "Settings"
  | "TrackingParams"
  | (string & {});

export type DynamicTextCampaignFieldName =
  | "BiddingStrategy"
  | "Settings"
  | "CounterIds"
  | (string & {});

export type CpmBannerCampaignFieldName =
  | "BiddingStrategy"
  | "Settings"
  | "CounterIds"
  | (string & {});

export type SmartCampaignFieldName =
  | "BiddingStrategy"
  | "CounterIds"
  | "Settings"
  | (string & {});

export type UnifiedCampaignFieldName =
  | "BiddingStrategy"
  | "CounterIds"
  | "Settings"
  | (string & {});

export interface CampaignsGetRequest extends GetMethodParams<CampaignFieldName, CampaignsSelectionCriteria> {
  TextCampaignFieldNames?: FieldNames<TextCampaignFieldName>;
  MobileAppCampaignFieldNames?: FieldNames<MobileAppCampaignFieldName>;
  DynamicTextCampaignFieldNames?: FieldNames<DynamicTextCampaignFieldName>;
  CpmBannerCampaignFieldNames?: FieldNames<CpmBannerCampaignFieldName>;
  SmartCampaignFieldNames?: FieldNames<SmartCampaignFieldName>;
  UnifiedCampaignFieldNames?: FieldNames<UnifiedCampaignFieldName>;
}

export interface Campaign {
  Id?: YandexDirectId;
  Name?: string;
  Type?: CampaignType;
  State?: CampaignState;
  Status?: CampaignStatus;
  StartDate?: string;
  [key: string]: unknown;
}

export interface CampaignsGetResult {
  Campaigns: Campaign[];
}

export interface CampaignMutationCommon {
  Name?: string;
  StartDate?: string;
  DailyBudget?: number;
  Strategy?: Record<string, unknown>;
  Notification?: Record<string, unknown>;
  TimeTargeting?: Record<string, unknown>;
  TextCampaign?: Record<string, unknown>;
  MobileAppCampaign?: Record<string, unknown>;
  DynamicTextCampaign?: Record<string, unknown>;
  CpmBannerCampaign?: Record<string, unknown>;
  SmartCampaign?: Record<string, unknown>;
  UnifiedCampaign?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CampaignAddOperation extends CampaignMutationCommon {
  Name: string;
  StartDate: string;
}

export interface CampaignUpdateOperation extends CampaignMutationCommon {
  Id: YandexDirectId;
}

export interface CampaignsAddRequest {
  Campaigns: readonly CampaignAddOperation[];
}

export interface CampaignsUpdateRequest {
  Campaigns: readonly CampaignUpdateOperation[];
}

export interface CampaignsStateSelectionCriteria {
  Ids: readonly YandexDirectId[];
}

export interface CampaignsSuspendRequest {
  SelectionCriteria: CampaignsStateSelectionCriteria;
}

export interface CampaignsResumeRequest {
  SelectionCriteria: CampaignsStateSelectionCriteria;
}

export interface CampaignsDeleteRequest {
  SelectionCriteria: CampaignsStateSelectionCriteria;
}

export interface CampaignsArchiveRequest {
  SelectionCriteria: CampaignsStateSelectionCriteria;
}

export interface CampaignsUnarchiveRequest {
  SelectionCriteria: CampaignsStateSelectionCriteria;
}

export type CampaignsAddResult = AddMutationResult;
export type CampaignsDeleteResult = DeleteMutationResult;
export type CampaignsUpdateResult = UpdateMutationResult;
export type CampaignsSuspendResult = StateTransitionMutationResult<"SuspendResults">;
export type CampaignsResumeResult = StateTransitionMutationResult<"ResumeResults">;
export type CampaignsArchiveResult = StateTransitionMutationResult<"ArchiveResults">;
export type CampaignsUnarchiveResult = StateTransitionMutationResult<"UnarchiveResults">;
