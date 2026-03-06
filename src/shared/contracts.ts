export interface UnitsUsage {
  raw: string;
  spent?: number;
  remaining?: number;
  limit?: number;
}

export interface EnvelopeMetadata {
  requestId?: string;
  units?: UnitsUsage;
  [key: string]: unknown;
}

export interface YandexDirectApiErrorPayload {
  request_id?: string;
  error_code?: number;
  error_string?: string;
  error_detail?: string;
}

export interface ApiMessage {
  Code?: number;
  Message?: string;
  Details?: string;
}

export interface JsonRpcRequestEnvelope<TMethod extends string = string, TParams = unknown> {
  method: TMethod;
  params?: TParams;
  [key: string]: unknown;
}

export interface JsonRpcSuccessEnvelope<TResult = unknown, TMeta extends EnvelopeMetadata = EnvelopeMetadata> {
  result: TResult;
  error?: undefined;
  warnings?: ApiMessage[];
  meta?: TMeta;
  [key: string]: unknown;
}

export interface JsonRpcErrorEnvelope<TMeta extends EnvelopeMetadata = EnvelopeMetadata> {
  result?: undefined;
  error: YandexDirectApiErrorPayload;
  warnings?: ApiMessage[];
  meta?: TMeta;
  [key: string]: unknown;
}

export type JsonRpcResponseEnvelope<TResult = unknown, TMeta extends EnvelopeMetadata = EnvelopeMetadata> =
  | JsonRpcSuccessEnvelope<TResult, TMeta>
  | JsonRpcErrorEnvelope<TMeta>;

export type YandexDirectId = number;
export type YandexDirectIds = readonly YandexDirectId[];
export type FieldNames<TField extends string = string> = readonly TField[];

export interface PaginationPage {
  Limit: number;
  Offset?: number;
}

export interface SelectionCriteriaBase {
  Ids?: YandexDirectIds;
  [key: string]: unknown;
}

export interface GetMethodParams<TField extends string = string, TCriteria extends SelectionCriteriaBase = SelectionCriteriaBase> {
  SelectionCriteria?: TCriteria;
  FieldNames: FieldNames<TField>;
  Page?: PaginationPage;
}

export interface MutationResultMessage {
  Code?: number;
  Message?: string;
  Details?: string;
}

export interface MutationItemResult<TId extends YandexDirectId = YandexDirectId> {
  Id?: TId;
  Index?: number;
  Errors?: MutationResultMessage[];
  Warnings?: MutationResultMessage[];
}

export interface AddMutationResult<TId extends YandexDirectId = YandexDirectId> {
  AddResults: MutationItemResult<TId>[];
}

export interface UpdateMutationResult<TId extends YandexDirectId = YandexDirectId> {
  UpdateResults: MutationItemResult<TId>[];
}

export type StateTransitionMutationResult<
  TResultKey extends string = `${string}Results`,
  TId extends YandexDirectId = YandexDirectId,
> = Record<TResultKey, MutationItemResult<TId>[]>;
