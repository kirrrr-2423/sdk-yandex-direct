import type {
  AddMutationResult,
  FieldNames,
  GetMethodParams,
  SelectionCriteriaBase,
  UpdateMutationResult,
  YandexDirectId,
} from "../shared/contracts.js";

type ExtensibleLiteral<T extends string> = T | (string & {});

export type AgencyClientsArchived = ExtensibleLiteral<"YES" | "NO">;

export interface AgencyClientsSelectionCriteria extends SelectionCriteriaBase {
  Logins?: readonly string[];
  Archived?: AgencyClientsArchived;
}

export type AgencyClientFieldName = ExtensibleLiteral<
  | "AccountQuality"
  | "Archived"
  | "ClientId"
  | "ClientInfo"
  | "CountryId"
  | "CreatedAt"
  | "Currency"
  | "Grants"
  | "Bonuses"
  | "Login"
  | "Notification"
  | "OverdraftSumAvailable"
  | "Phone"
  | "Representatives"
  | "Restrictions"
  | "Settings"
  | "Type"
  | "VatRate"
  | "ForbiddenPlatform"
  | "AvailableCampaignTypes"
  | "TinInfo"
  | "ErirAttributes"
>;

export interface AgencyClientsGetRequest extends GetMethodParams<AgencyClientFieldName, AgencyClientsSelectionCriteria> {
  FieldNames: FieldNames<AgencyClientFieldName>;
}

export interface AgencyClientGetItem {
  ClientId?: YandexDirectId;
  Login?: string;
  ClientInfo?: string;
  Archived?: AgencyClientsArchived;
  Type?: string;
  Currency?: string;
  [key: string]: unknown;
}

export interface AgencyClientsGetResult {
  Clients: AgencyClientGetItem[];
  LimitedBy?: number;
}

export interface AgencyClientAddItem {
  Login: string;
  ClientInfo: string;
  Representative: {
    Login: string;
    FirstName: string;
    LastName?: string;
    [key: string]: unknown;
  };
  Notification?: Record<string, unknown>;
  Settings?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AgencyClientsAddRequest {
  Clients: readonly AgencyClientAddItem[];
}

export type AgencyClientsAddResult = AddMutationResult;

export interface AgencyClientUpdateItem {
  ClientId: YandexDirectId;
  ClientInfo?: string;
  Notification?: Record<string, unknown>;
  Settings?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AgencyClientsUpdateRequest {
  Clients: readonly AgencyClientUpdateItem[];
}

export type AgencyClientsUpdateResult = UpdateMutationResult;
