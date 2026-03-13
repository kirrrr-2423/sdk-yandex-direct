import { TransportError } from "../errors.js";
import type { JsonRpcSuccessEnvelope } from "../shared/contracts.js";
import { ensureNonEmptyString } from "../shared/validation.js";
import type { JsonEnvelope, RequestOptions, TransportResponse } from "../types.js";
import { YandexDirectTransport } from "../transport.js";
import { assertSupportedAddAds, assertSupportedUpdateAds, ensureAdsGetResult } from "./guards.js";
import type {
  AdsAddRequest,
  AdsAddResult,
  AdsArchiveRequest,
  AdsArchiveResult,
  AdsDeleteRequest,
  AdsDeleteResult,
  AdsGetRequest,
  AdsGetResult,
  AdsModerateRequest,
  AdsModerateResult,
  AdsResumeRequest,
  AdsResumeResult,
  AdsSuspendRequest,
  AdsSuspendResult,
  AdsUnarchiveRequest,
  AdsUnarchiveResult,
  AdsUpdateRequest,
  AdsUpdateResult,
} from "./types.js";

type AdsMethod =
  | "get"
  | "add"
  | "update"
  | "delete"
  | "suspend"
  | "resume"
  | "archive"
  | "unarchive"
  | "moderate";
type AdsEnvelope<TResult> = TransportResponse<JsonRpcSuccessEnvelope<TResult>>;

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TransportError(`${name} must be an object.`, { retryable: false });
  }
  return value as Record<string, unknown>;
}

function ensureSuccessEnvelope<TResult>(
  envelope: JsonEnvelope<TResult>,
  method: AdsMethod,
): JsonRpcSuccessEnvelope<TResult> {
  const record = asRecord(envelope, `Ads.${method} response envelope`);
  if (!("result" in record)) {
    throw new TransportError(`Ads.${method} response envelope is missing "result".`, {
      retryable: false,
    });
  }

  return {
    ...record,
    result: record.result as TResult,
    error: undefined,
  };
}

function ensureResult<TResult>(envelope: JsonRpcSuccessEnvelope<TResult>): TResult {
  return envelope.result;
}

function ensureResultArrayField(
  result: unknown,
  key: string,
  method: AdsMethod,
): void {
  const record = asRecord(result, `Ads.${method} result`);
  if (!Array.isArray(record[key])) {
    throw new TransportError(`Ads.${method} result is missing "${key}" array.`, {
      retryable: false,
    });
  }
}

function ensureSelectionCriteria(value: unknown, method: AdsMethod): void {
  asRecord(value, `Ads.${method} params.SelectionCriteria`);
}

function mergeOptionsWithIdempotentDefault(
  options: RequestOptions | undefined,
  idempotent: boolean,
): RequestOptions {
  if (!options) {
    return { idempotent };
  }

  if (options.idempotent !== undefined) {
    return options;
  }

  return { ...options, idempotent };
}

export class AdsService {
  private readonly transport: YandexDirectTransport;
  private readonly serviceName: string;

  constructor(transport: YandexDirectTransport, serviceName = "ads") {
    this.transport = transport;
    this.serviceName = ensureNonEmptyString(serviceName, "serviceName");
  }

  async get(
    params: AdsGetRequest,
    options?: RequestOptions,
  ): Promise<AdsEnvelope<AdsGetResult>> {
    const response = await this.transport.requestService<AdsGetResult>(
      this.serviceName,
      { method: "get", params },
      mergeOptionsWithIdempotentDefault(options, true),
    );

    const envelope = ensureSuccessEnvelope(response.data, "get");
    const result = ensureResult(envelope);
    const validated = ensureAdsGetResult(result);
    return {
      ...response,
      data: {
        ...envelope,
        result: validated,
      },
    };
  }

  async add(
    params: AdsAddRequest,
    options?: RequestOptions,
  ): Promise<AdsEnvelope<AdsAddResult>> {
    assertSupportedAddAds(params.Ads);

    const response = await this.transport.requestService<AdsAddResult>(
      this.serviceName,
      { method: "add", params },
      options,
    );

    const envelope = ensureSuccessEnvelope(response.data, "add");
    ensureResultArrayField(ensureResult(envelope), "AddResults", "add");
    return { ...response, data: envelope };
  }

  async update(
    params: AdsUpdateRequest,
    options?: RequestOptions,
  ): Promise<AdsEnvelope<AdsUpdateResult>> {
    assertSupportedUpdateAds(params.Ads);

    const response = await this.transport.requestService<AdsUpdateResult>(
      this.serviceName,
      { method: "update", params },
      options,
    );

    const envelope = ensureSuccessEnvelope(response.data, "update");
    ensureResultArrayField(ensureResult(envelope), "UpdateResults", "update");
    return { ...response, data: envelope };
  }

  async suspend(
    params: AdsSuspendRequest,
    options?: RequestOptions,
  ): Promise<AdsEnvelope<AdsSuspendResult>> {
    ensureSelectionCriteria(params.SelectionCriteria, "suspend");

    const response = await this.transport.requestService<AdsSuspendResult>(
      this.serviceName,
      { method: "suspend", params },
      mergeOptionsWithIdempotentDefault(options, true),
    );

    const envelope = ensureSuccessEnvelope(response.data, "suspend");
    ensureResultArrayField(ensureResult(envelope), "SuspendResults", "suspend");
    return { ...response, data: envelope };
  }

  async resume(
    params: AdsResumeRequest,
    options?: RequestOptions,
  ): Promise<AdsEnvelope<AdsResumeResult>> {
    ensureSelectionCriteria(params.SelectionCriteria, "resume");

    const response = await this.transport.requestService<AdsResumeResult>(
      this.serviceName,
      { method: "resume", params },
      mergeOptionsWithIdempotentDefault(options, true),
    );

    const envelope = ensureSuccessEnvelope(response.data, "resume");
    ensureResultArrayField(ensureResult(envelope), "ResumeResults", "resume");
    return { ...response, data: envelope };
  }

  async delete(
    params: AdsDeleteRequest,
    options?: RequestOptions,
  ): Promise<AdsEnvelope<AdsDeleteResult>> {
    ensureSelectionCriteria(params.SelectionCriteria, "delete");

    const response = await this.transport.requestService<AdsDeleteResult>(
      this.serviceName,
      { method: "delete", params },
      mergeOptionsWithIdempotentDefault(options, true),
    );

    const envelope = ensureSuccessEnvelope(response.data, "delete");
    ensureResultArrayField(ensureResult(envelope), "DeleteResults", "delete");
    return { ...response, data: envelope };
  }

  async archive(
    params: AdsArchiveRequest,
    options?: RequestOptions,
  ): Promise<AdsEnvelope<AdsArchiveResult>> {
    ensureSelectionCriteria(params.SelectionCriteria, "archive");

    const response = await this.transport.requestService<AdsArchiveResult>(
      this.serviceName,
      { method: "archive", params },
      mergeOptionsWithIdempotentDefault(options, true),
    );

    const envelope = ensureSuccessEnvelope(response.data, "archive");
    ensureResultArrayField(ensureResult(envelope), "ArchiveResults", "archive");
    return { ...response, data: envelope };
  }

  async unarchive(
    params: AdsUnarchiveRequest,
    options?: RequestOptions,
  ): Promise<AdsEnvelope<AdsUnarchiveResult>> {
    ensureSelectionCriteria(params.SelectionCriteria, "unarchive");

    const response = await this.transport.requestService<AdsUnarchiveResult>(
      this.serviceName,
      { method: "unarchive", params },
      mergeOptionsWithIdempotentDefault(options, true),
    );

    const envelope = ensureSuccessEnvelope(response.data, "unarchive");
    ensureResultArrayField(ensureResult(envelope), "UnarchiveResults", "unarchive");
    return { ...response, data: envelope };
  }

  async moderate(
    params: AdsModerateRequest,
    options?: RequestOptions,
  ): Promise<AdsEnvelope<AdsModerateResult>> {
    ensureSelectionCriteria(params.SelectionCriteria, "moderate");

    const response = await this.transport.requestService<AdsModerateResult>(
      this.serviceName,
      { method: "moderate", params },
      mergeOptionsWithIdempotentDefault(options, true),
    );

    const envelope = ensureSuccessEnvelope(response.data, "moderate");
    ensureResultArrayField(ensureResult(envelope), "ModerateResults", "moderate");
    return { ...response, data: envelope };
  }
}
