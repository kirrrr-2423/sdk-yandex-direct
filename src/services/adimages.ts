import {
  ensureNonEmptyString,
  ensurePaginationPage,
} from "../shared/validation.js";
import { YandexDirectTransport } from "../transport.js";
import type { JsonEnvelope, RequestOptions, TransportResponse } from "../types.js";
import type {
  AdImageAddItem,
  AdImagesAddRequest,
  AdImagesAddResult,
  AdImagesDeleteRequest,
  AdImagesDeleteResult,
  AdImagesGetRequest,
  AdImagesGetResult,
} from "../models/adimages.js";

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

function ensureOptionalStringArray(value: unknown, name: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return ensureStringArray(value, name);
}

function ensureGetRequest(value: unknown): AdImagesGetRequest {
  const record = asRecord(value, "params");
  const selection = record.SelectionCriteria === undefined
    ? undefined
    : asRecord(record.SelectionCriteria, "params.SelectionCriteria");

  return {
    SelectionCriteria: selection === undefined
      ? undefined
      : {
        AdImageHashes: ensureOptionalStringArray(
          selection.AdImageHashes,
          "params.SelectionCriteria.AdImageHashes",
        ),
        Associated: selection.Associated === undefined
          ? undefined
          : ensureNonEmptyString(selection.Associated, "params.SelectionCriteria.Associated"),
      },
    FieldNames: ensureStringArray(record.FieldNames, "params.FieldNames"),
    Page: record.Page === undefined ? undefined : ensurePaginationPage(record.Page, "params.Page"),
  };
}

function ensureAddItem(value: unknown, name: string): AdImageAddItem {
  const record = asRecord(value, name);

  return {
    ImageData: ensureNonEmptyString(record.ImageData, `${name}.ImageData`),
    Name: ensureNonEmptyString(record.Name, `${name}.Name`),
    Type: record.Type === undefined ? undefined : ensureNonEmptyString(record.Type, `${name}.Type`),
  };
}

function ensureAddRequest(value: unknown): AdImagesAddRequest {
  const record = asRecord(value, "params");
  if (!Array.isArray(record.AdImages) || record.AdImages.length === 0) {
    throw new TypeError("params.AdImages must be a non-empty array.");
  }

  return {
    AdImages: record.AdImages.map((entry, index) => ensureAddItem(entry, `params.AdImages[${index}]`)),
  };
}

function ensureDeleteRequest(value: unknown): AdImagesDeleteRequest {
  const record = asRecord(value, "params");
  const selection = asRecord(record.SelectionCriteria, "params.SelectionCriteria");

  return {
    SelectionCriteria: {
      AdImageHashes: ensureStringArray(
        selection.AdImageHashes,
        "params.SelectionCriteria.AdImageHashes",
      ),
    },
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

export class AdImagesService {
  constructor(private readonly transport: YandexDirectTransport) {}

  async get(
    params: AdImagesGetRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<AdImagesGetResult>>> {
    const validated = ensureGetRequest(params);
    return this.transport.requestService<AdImagesGetResult>(
      "adimages",
      {
        method: "get",
        params: validated,
      },
      applyIdempotency(options, true),
    );
  }

  async add(
    params: AdImagesAddRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<AdImagesAddResult>>> {
    const validated = ensureAddRequest(params);
    return this.transport.requestService<AdImagesAddResult>(
      "adimages",
      {
        method: "add",
        params: validated,
      },
      applyIdempotency(options, false),
    );
  }

  async delete(
    params: AdImagesDeleteRequest,
    options?: RequestOptions,
  ): Promise<TransportResponse<JsonEnvelope<AdImagesDeleteResult>>> {
    const validated = ensureDeleteRequest(params);
    return this.transport.requestService<AdImagesDeleteResult>(
      "adimages",
      {
        method: "delete",
        params: validated,
      },
      applyIdempotency(options, true),
    );
  }
}
