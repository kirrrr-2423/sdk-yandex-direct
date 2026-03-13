import {
  ensureIds,
  ensureNonEmptyString,
  ensurePaginationPage,
} from "../shared/validation.js";
import { YandexDirectTransport } from "../transport.js";
import type { JsonEnvelope, RequestOptions, TransportResponse } from "../types.js";
import type {
  SitelinkItem,
  SitelinksAddItem,
  SitelinksAddRequest,
  SitelinksAddResult,
  SitelinksDeleteRequest,
  SitelinksDeleteResult,
  SitelinksGetRequest,
  SitelinksGetResult,
  SitelinksSelectionCriteria,
} from "../models/sitelinks.js";

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function ensureStringArray(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${name} must be a non-empty array of strings.`);
  }

  return value.map((entry, index) => ensureNonEmptyString(entry, `${name}[${index}]`));
}

function ensureSelectionCriteria(value: unknown): SitelinksSelectionCriteria {
  const record = asRecord(value, "params.SelectionCriteria");
  const ids = record.Ids === undefined ? undefined : ensureIds(record.Ids, "params.SelectionCriteria.Ids");
  if (ids !== undefined && ids.length === 0) {
    throw new TypeError("params.SelectionCriteria.Ids must include at least one id.");
  }

  return { Ids: ids };
}

function ensureGetRequest(value: unknown): SitelinksGetRequest {
  const record = asRecord(value, "params");
  return {
    SelectionCriteria: record.SelectionCriteria === undefined
      ? undefined
      : ensureSelectionCriteria(record.SelectionCriteria),
    FieldNames: ensureStringArray(record.FieldNames, "params.FieldNames"),
    Page: record.Page === undefined ? undefined : ensurePaginationPage(record.Page, "params.Page"),
  };
}

function ensureSitelinkItem(value: unknown, name: string): SitelinkItem {
  const record = asRecord(value, name);
  return {
    ...record,
    Title: ensureNonEmptyString(record.Title, `${name}.Title`),
    Href: record.Href === undefined ? undefined : ensureNonEmptyString(record.Href, `${name}.Href`),
    Description: record.Description === undefined
      ? undefined
      : ensureNonEmptyString(record.Description, `${name}.Description`),
  };
}

function ensureAddItem(value: unknown, name: string): SitelinksAddItem {
  const record = asRecord(value, name);
  if (!Array.isArray(record.Sitelinks) || record.Sitelinks.length === 0) {
    throw new TypeError(`${name}.Sitelinks must be a non-empty array.`);
  }

  return {
    Sitelinks: record.Sitelinks.map((entry, index) => ensureSitelinkItem(entry, `${name}.Sitelinks[${index}]`)),
  };
}

function ensureAddRequest(value: unknown): SitelinksAddRequest {
  const record = asRecord(value, "params");
  if (!Array.isArray(record.SitelinksSets) || record.SitelinksSets.length === 0) {
    throw new TypeError("params.SitelinksSets must be a non-empty array.");
  }

  return {
    SitelinksSets: record.SitelinksSets.map((entry, index) => ensureAddItem(entry, `params.SitelinksSets[${index}]`)),
  };
}

function ensureDeleteRequest(value: unknown): SitelinksDeleteRequest {
  const record = asRecord(value, "params");
  const selection = asRecord(record.SelectionCriteria, "params.SelectionCriteria");
  const ids = ensureIds(selection.Ids, "params.SelectionCriteria.Ids");

  if (ids.length === 0) {
    throw new TypeError("params.SelectionCriteria.Ids must include at least one id.");
  }

  return {
    SelectionCriteria: { Ids: ids },
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

export class SitelinksService {
  constructor(private readonly transport: YandexDirectTransport) {}

  async get(
    params: SitelinksGetRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<SitelinksGetResult>>> {
    const validated = ensureGetRequest(params);
    return this.transport.requestService<SitelinksGetResult>(
      "sitelinks",
      { method: "get", params: validated },
      applyIdempotency(options, true),
    );
  }

  async add(
    params: SitelinksAddRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<SitelinksAddResult>>> {
    const validated = ensureAddRequest(params);
    return this.transport.requestService<SitelinksAddResult>(
      "sitelinks",
      { method: "add", params: validated },
      applyIdempotency(options, false),
    );
  }

  async delete(
    params: SitelinksDeleteRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<SitelinksDeleteResult>>> {
    const validated = ensureDeleteRequest(params);
    return this.transport.requestService<SitelinksDeleteResult>(
      "sitelinks",
      { method: "delete", params: validated },
      applyIdempotency(options, true),
    );
  }
}
