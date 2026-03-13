import {
  ensureNonEmptyString,
  ensurePaginationPage,
  ensurePositiveInteger,
} from "../shared/validation.js";
import { YandexDirectTransport } from "../transport.js";
import type { JsonEnvelope, RequestOptions, TransportResponse } from "../types.js";
import type {
  AgencyClientAddItem,
  AgencyClientUpdateItem,
  AgencyClientsAddRequest,
  AgencyClientsAddResult,
  AgencyClientsGetRequest,
  AgencyClientsGetResult,
  AgencyClientsSelectionCriteria,
  AgencyClientsUpdateRequest,
  AgencyClientsUpdateResult,
} from "../models/agencyclients.js";

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function ensureStringArray(value: unknown, name: string, allowEmpty = false): string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new TypeError(`${name} must be ${allowEmpty ? "an array" : "a non-empty array"} of strings.`);
  }

  return value.map((entry, index) => ensureNonEmptyString(entry, `${name}[${index}]`));
}

function ensureSelectionCriteria(value: unknown): AgencyClientsSelectionCriteria {
  const record = asRecord(value, "params.SelectionCriteria");

  return {
    Logins: record.Logins === undefined ? undefined : ensureStringArray(record.Logins, "params.SelectionCriteria.Logins"),
    Archived: record.Archived === undefined
      ? undefined
      : ensureNonEmptyString(record.Archived, "params.SelectionCriteria.Archived"),
  };
}

function ensureGetRequest(value: unknown): AgencyClientsGetRequest {
  const record = asRecord(value, "params");
  return {
    SelectionCriteria: record.SelectionCriteria === undefined
      ? undefined
      : ensureSelectionCriteria(record.SelectionCriteria),
    FieldNames: ensureStringArray(record.FieldNames, "params.FieldNames"),
    Page: record.Page === undefined ? undefined : ensurePaginationPage(record.Page, "params.Page"),
  };
}

function ensureRepresentative(value: unknown, name: string): Record<string, unknown> {
  const record = asRecord(value, name);
  return {
    ...record,
    Login: ensureNonEmptyString(record.Login, `${name}.Login`),
    FirstName: ensureNonEmptyString(record.FirstName, `${name}.FirstName`),
    LastName: record.LastName === undefined ? undefined : ensureNonEmptyString(record.LastName, `${name}.LastName`),
  };
}

function ensureAddItem(value: unknown, name: string): AgencyClientAddItem {
  const record = asRecord(value, name);
  return {
    ...record,
    Login: ensureNonEmptyString(record.Login, `${name}.Login`),
    ClientInfo: ensureNonEmptyString(record.ClientInfo, `${name}.ClientInfo`),
    Representative: ensureRepresentative(record.Representative, `${name}.Representative`) as AgencyClientAddItem["Representative"],
  };
}

function ensureAddRequest(value: unknown): AgencyClientsAddRequest {
  const record = asRecord(value, "params");
  if (!Array.isArray(record.Clients) || record.Clients.length === 0) {
    throw new TypeError("params.Clients must be a non-empty array.");
  }

  return {
    Clients: record.Clients.map((entry, index) => ensureAddItem(entry, `params.Clients[${index}]`)),
  };
}

function ensureUpdateItem(value: unknown, name: string): AgencyClientUpdateItem {
  const record = asRecord(value, name);
  const hasChanges = Object.entries(record).some(([key, entryValue]) => key !== "ClientId" && entryValue !== undefined);
  if (!hasChanges) {
    throw new TypeError(`${name} must contain at least one field to update besides ClientId.`);
  }

  return {
    ...record,
    ClientId: ensurePositiveInteger(record.ClientId, `${name}.ClientId`),
    ClientInfo: record.ClientInfo === undefined ? undefined : ensureNonEmptyString(record.ClientInfo, `${name}.ClientInfo`),
  };
}

function ensureUpdateRequest(value: unknown): AgencyClientsUpdateRequest {
  const record = asRecord(value, "params");
  if (!Array.isArray(record.Clients) || record.Clients.length === 0) {
    throw new TypeError("params.Clients must be a non-empty array.");
  }

  return {
    Clients: record.Clients.map((entry, index) => ensureUpdateItem(entry, `params.Clients[${index}]`)),
  };
}

function applyIdempotency(options: RequestOptions | undefined, idempotent: boolean): RequestOptions {
  if (options?.idempotent !== undefined) {
    return options;
  }

  return {
    ...(options ?? {}),
    idempotent,
  };
}

export class AgencyClientsService {
  constructor(private readonly transport: YandexDirectTransport) {}

  async get(
    params: AgencyClientsGetRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<AgencyClientsGetResult>>> {
    const validated = ensureGetRequest(params);
    return this.transport.requestService<AgencyClientsGetResult>(
      "agencyclients",
      { method: "get", params: validated },
      applyIdempotency(options, true),
    );
  }

  async add(
    params: AgencyClientsAddRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<AgencyClientsAddResult>>> {
    const validated = ensureAddRequest(params);
    return this.transport.requestService<AgencyClientsAddResult>(
      "agencyclients",
      { method: "add", params: validated },
      applyIdempotency(options, false),
    );
  }

  async update(
    params: AgencyClientsUpdateRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<AgencyClientsUpdateResult>>> {
    const validated = ensureUpdateRequest(params);
    return this.transport.requestService<AgencyClientsUpdateResult>(
      "agencyclients",
      { method: "update", params: validated },
      applyIdempotency(options, false),
    );
  }
}
