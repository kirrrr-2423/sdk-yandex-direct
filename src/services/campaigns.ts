import {
  ensureIds,
  ensureNonEmptyString,
  ensurePaginationPage,
  ensurePositiveInteger,
} from "../shared/validation.js";
import { YandexDirectTransport } from "../transport.js";
import type { JsonEnvelope, RequestOptions, TransportResponse } from "../types.js";
import type {
  CampaignAddOperation,
  CampaignsAddRequest,
  CampaignsAddResult,
  CampaignsArchiveRequest,
  CampaignsArchiveResult,
  CampaignsDeleteRequest,
  CampaignsDeleteResult,
  CampaignsGetRequest,
  CampaignsGetResult,
  CampaignsResumeRequest,
  CampaignsResumeResult,
  CampaignsSuspendRequest,
  CampaignsSuspendResult,
  CampaignsUnarchiveRequest,
  CampaignsUnarchiveResult,
  CampaignsUpdateRequest,
  CampaignsUpdateResult,
  CampaignUpdateOperation,
} from "../models/campaigns.js";

const CAMPAIGN_SUBTYPE_KEYS = [
  "TextCampaign",
  "MobileAppCampaign",
  "DynamicTextCampaign",
  "CpmBannerCampaign",
  "SmartCampaign",
  "UnifiedCampaign",
] as const;

const GET_OPTIONAL_FIELD_SET_KEYS = [
  "TextCampaignFieldNames",
  "MobileAppCampaignFieldNames",
  "DynamicTextCampaignFieldNames",
  "CpmBannerCampaignFieldNames",
  "SmartCampaignFieldNames",
  "UnifiedCampaignFieldNames",
] as const;

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function ensureNonEmptyStringArray(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${name} must be a non-empty array of strings.`);
  }

  return value.map((entry, index) => ensureNonEmptyString(entry, `${name}[${index}]`));
}

function ensureNonEmptyRecordArray(value: unknown, name: string): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${name} must be a non-empty array.`);
  }

  return value.map((entry, index) => asRecord(entry, `${name}[${index}]`));
}

function ensureContainsCampaignSubtype(campaign: Record<string, unknown>, name: string): void {
  const hasSubtype = CAMPAIGN_SUBTYPE_KEYS.some((key) => isObject(campaign[key]));
  if (!hasSubtype) {
    throw new TypeError(
      `${name} must include at least one campaign subtype payload (${CAMPAIGN_SUBTYPE_KEYS.join(", ")}).`,
    );
  }
}

function validateGetRequest(input: CampaignsGetRequest): CampaignsGetRequest {
  const request = asRecord(input, "params");
  const validated: Record<string, unknown> = {
    ...request,
    FieldNames: ensureNonEmptyStringArray(request.FieldNames, "params.FieldNames"),
  };

  if (request.SelectionCriteria !== undefined) {
    validated.SelectionCriteria = asRecord(request.SelectionCriteria, "params.SelectionCriteria");
  }

  if (request.Page !== undefined) {
    validated.Page = ensurePaginationPage(request.Page, "params.Page");
  }

  for (const key of GET_OPTIONAL_FIELD_SET_KEYS) {
    if (request[key] !== undefined) {
      validated[key] = ensureNonEmptyStringArray(request[key], `params.${key}`);
    }
  }

  return validated as unknown as CampaignsGetRequest;
}

function validateAddCampaign(input: Record<string, unknown>, path: string): CampaignAddOperation {
  const campaign = { ...input };
  campaign.Name = ensureNonEmptyString(campaign.Name, `${path}.Name`);
  campaign.StartDate = ensureNonEmptyString(campaign.StartDate, `${path}.StartDate`);
  ensureContainsCampaignSubtype(campaign, path);
  return campaign as CampaignAddOperation;
}

function validateAddRequest(input: CampaignsAddRequest): CampaignsAddRequest {
  const request = asRecord(input, "params");
  const campaigns = ensureNonEmptyRecordArray(request.Campaigns, "params.Campaigns");

  return {
    ...request,
    Campaigns: campaigns.map((campaign, index) =>
      validateAddCampaign(campaign, `params.Campaigns[${index}]`)
    ),
  } as CampaignsAddRequest;
}

function validateUpdateCampaign(input: Record<string, unknown>, path: string): CampaignUpdateOperation {
  const campaign = { ...input };
  campaign.Id = ensurePositiveInteger(campaign.Id, `${path}.Id`);

  if (campaign.Name !== undefined) {
    campaign.Name = ensureNonEmptyString(campaign.Name, `${path}.Name`);
  }

  if (campaign.StartDate !== undefined) {
    campaign.StartDate = ensureNonEmptyString(campaign.StartDate, `${path}.StartDate`);
  }

  return campaign as CampaignUpdateOperation;
}

function validateUpdateRequest(input: CampaignsUpdateRequest): CampaignsUpdateRequest {
  const request = asRecord(input, "params");
  const campaigns = ensureNonEmptyRecordArray(request.Campaigns, "params.Campaigns");

  return {
    ...request,
    Campaigns: campaigns.map((campaign, index) =>
      validateUpdateCampaign(campaign, `params.Campaigns[${index}]`)
    ),
  } as CampaignsUpdateRequest;
}

function validateStateRequest(
  input:
    | CampaignsSuspendRequest
    | CampaignsResumeRequest
    | CampaignsDeleteRequest
    | CampaignsArchiveRequest
    | CampaignsUnarchiveRequest,
):
  | CampaignsSuspendRequest
  | CampaignsResumeRequest
  | CampaignsDeleteRequest
  | CampaignsArchiveRequest
  | CampaignsUnarchiveRequest {
  const request = asRecord(input, "params");
  const selection = asRecord(request.SelectionCriteria, "params.SelectionCriteria");
  const ids = ensureIds(selection.Ids, "params.SelectionCriteria.Ids");

  if (ids.length === 0) {
    throw new TypeError("params.SelectionCriteria.Ids must include at least one id.");
  }

  return {
    ...request,
    SelectionCriteria: {
      ...selection,
      Ids: ids,
    },
  } as CampaignsSuspendRequest | CampaignsResumeRequest;
}

function withDefaultIdempotent(options: RequestOptions | undefined, idempotent: boolean): RequestOptions {
  if (options?.idempotent !== undefined) {
    return options;
  }

  return {
    ...(options ?? {}),
    idempotent,
  };
}

export class CampaignsService {
  constructor(private readonly transport: YandexDirectTransport) {}

  async get(
    params: CampaignsGetRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<CampaignsGetResult>>> {
    const validated = validateGetRequest(params);
    return this.transport.requestService<CampaignsGetResult>(
      "campaigns",
      {
        method: "get",
        params: validated,
      },
      withDefaultIdempotent(options, true),
    );
  }

  async add(
    params: CampaignsAddRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<CampaignsAddResult>>> {
    const validated = validateAddRequest(params);
    return this.transport.requestService<CampaignsAddResult>(
      "campaigns",
      {
        method: "add",
        params: validated,
      },
      options,
    );
  }

  async update(
    params: CampaignsUpdateRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<CampaignsUpdateResult>>> {
    const validated = validateUpdateRequest(params);
    return this.transport.requestService<CampaignsUpdateResult>(
      "campaigns",
      {
        method: "update",
        params: validated,
      },
      options,
    );
  }

  async suspend(
    params: CampaignsSuspendRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<CampaignsSuspendResult>>> {
    const validated = validateStateRequest(params) as CampaignsSuspendRequest;
    return this.transport.requestService<CampaignsSuspendResult>(
      "campaigns",
      {
        method: "suspend",
        params: validated,
      },
      withDefaultIdempotent(options, true),
    );
  }

  async resume(
    params: CampaignsResumeRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<CampaignsResumeResult>>> {
    const validated = validateStateRequest(params) as CampaignsResumeRequest;
    return this.transport.requestService<CampaignsResumeResult>(
      "campaigns",
      {
        method: "resume",
        params: validated,
      },
      withDefaultIdempotent(options, true),
    );
  }

  async delete(
    params: CampaignsDeleteRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<CampaignsDeleteResult>>> {
    const validated = validateStateRequest(params) as CampaignsDeleteRequest;
    return this.transport.requestService<CampaignsDeleteResult>(
      "campaigns",
      {
        method: "delete",
        params: validated,
      },
      withDefaultIdempotent(options, true),
    );
  }

  async archive(
    params: CampaignsArchiveRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<CampaignsArchiveResult>>> {
    const validated = validateStateRequest(params) as CampaignsArchiveRequest;
    return this.transport.requestService<CampaignsArchiveResult>(
      "campaigns",
      {
        method: "archive",
        params: validated,
      },
      withDefaultIdempotent(options, true),
    );
  }

  async unarchive(
    params: CampaignsUnarchiveRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<CampaignsUnarchiveResult>>> {
    const validated = validateStateRequest(params) as CampaignsUnarchiveRequest;
    return this.transport.requestService<CampaignsUnarchiveResult>(
      "campaigns",
      {
        method: "unarchive",
        params: validated,
      },
      withDefaultIdempotent(options, true),
    );
  }
}
