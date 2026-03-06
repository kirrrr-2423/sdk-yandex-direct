import { ensureNonEmptyString } from "../shared/validation.js";
import { YandexDirectTransport } from "../transport.js";
import type {
  ReportExecutionState,
  ReportRequestOptions,
  TransportResponse,
} from "../types.js";

const REPORTS_SERVICE = "reports";
const CUSTOM_DATE_RANGE = "CUSTOM_DATE";

type OpenString = string & {};

export type ReportFormat = "TSV";
export type ReportDateRangeType =
  | "TODAY"
  | "YESTERDAY"
  | "LAST_3_DAYS"
  | "LAST_7_DAYS"
  | "LAST_14_DAYS"
  | "LAST_30_DAYS"
  | "LAST_90_DAYS"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "LAST_365_DAYS"
  | typeof CUSTOM_DATE_RANGE;
export type ReportIncludeFlag = "YES" | "NO";

export interface ReportsSelectionCriteria {
  DateFrom?: string;
  DateTo?: string;
  [key: string]: unknown;
}

export interface ReportDefinition<TField extends string = string> {
  /** Required by Yandex reports endpoint. */
  SelectionCriteria: ReportsSelectionCriteria;
  /** Required by Yandex reports endpoint. */
  FieldNames: readonly TField[];
  /** Required by Yandex reports endpoint. */
  ReportName: string;
  /** Required by Yandex reports endpoint. */
  ReportType: OpenString;
  /** Required by Yandex reports endpoint. */
  DateRangeType: ReportDateRangeType;
  /** Required by Yandex reports endpoint (`TSV`). */
  Format: ReportFormat;
  /** Required by Yandex reports endpoint (`YES` or `NO`). */
  IncludeVAT: ReportIncludeFlag;
  IncludeDiscount?: ReportIncludeFlag;
  [key: string]: unknown;
}

export interface ReportRequestBody<TDefinition extends ReportDefinition = ReportDefinition> {
  params: TDefinition;
}

export interface CompletedReportResponse {
  state: "completed";
  report: string;
  metadata: TransportResponse<string>["metadata"];
}

export interface PendingReportResponse {
  state: Exclude<ReportExecutionState, "completed">;
  report: string;
  metadata: TransportResponse<string>["metadata"];
  shouldPoll: true;
  retryInSeconds?: number;
  reportsInQueue?: number;
}

export type ReportResponse = CompletedReportResponse | PendingReportResponse;

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

function ensureIncludeFlag(
  value: unknown,
  name: string,
): ReportIncludeFlag {
  const normalized = ensureNonEmptyString(value, name);
  if (normalized !== "YES" && normalized !== "NO") {
    throw new TypeError(`${name} must be either YES or NO.`);
  }
  return normalized;
}

function ensureDateRangeType(
  value: unknown,
  name: string,
): ReportDateRangeType {
  return ensureNonEmptyString(value, name) as ReportDateRangeType;
}

function ensureSelectionCriteria(value: unknown): ReportsSelectionCriteria {
  const criteria = asRecord(value, "report.SelectionCriteria");
  return {
    ...criteria,
    DateFrom: criteria.DateFrom === undefined
      ? undefined
      : ensureNonEmptyString(criteria.DateFrom, "report.SelectionCriteria.DateFrom"),
    DateTo: criteria.DateTo === undefined
      ? undefined
      : ensureNonEmptyString(criteria.DateTo, "report.SelectionCriteria.DateTo"),
  };
}

function ensureDateRangeConsistency(
  criteria: ReportsSelectionCriteria,
  dateRangeType: ReportDateRangeType,
): void {
  if (dateRangeType === CUSTOM_DATE_RANGE) {
    if (!criteria.DateFrom || !criteria.DateTo) {
      throw new TypeError(
        "report.SelectionCriteria.DateFrom and report.SelectionCriteria.DateTo are required when DateRangeType is CUSTOM_DATE.",
      );
    }
  }
}

export function ensureReportDefinition(
  value: unknown,
): ReportDefinition {
  const report = asRecord(value, "report");
  const selectionCriteria = ensureSelectionCriteria(report.SelectionCriteria);
  const dateRangeType = ensureDateRangeType(report.DateRangeType, "report.DateRangeType");

  ensureDateRangeConsistency(selectionCriteria, dateRangeType);

  const includeDiscount = report.IncludeDiscount === undefined
    ? undefined
    : ensureIncludeFlag(report.IncludeDiscount, "report.IncludeDiscount");

  const format = ensureNonEmptyString(report.Format, "report.Format");
  if (format !== "TSV") {
    throw new TypeError("report.Format must be TSV.");
  }

  return {
    ...report,
    SelectionCriteria: selectionCriteria,
    FieldNames: ensureStringArray(report.FieldNames, "report.FieldNames"),
    ReportName: ensureNonEmptyString(report.ReportName, "report.ReportName"),
    ReportType: ensureNonEmptyString(report.ReportType, "report.ReportType"),
    DateRangeType: dateRangeType,
    Format: format as ReportFormat,
    IncludeVAT: ensureIncludeFlag(report.IncludeVAT, "report.IncludeVAT"),
    IncludeDiscount: includeDiscount,
  };
}

export function buildReportRequest<TDefinition extends ReportDefinition>(
  definition: TDefinition,
): ReportRequestBody<TDefinition> {
  return {
    params: ensureReportDefinition(definition) as TDefinition,
  };
}

export function isReportPending(response: ReportResponse): response is PendingReportResponse {
  return response.state !== "completed";
}

export class ReportsService {
  private readonly transport: YandexDirectTransport;

  constructor(transport: YandexDirectTransport) {
    this.transport = transport;
  }

  async create<TDefinition extends ReportDefinition>(
    definition: TDefinition,
    options: ReportRequestOptions = {},
  ): Promise<ReportResponse> {
    const body = buildReportRequest(definition);
    const response = await this.transport.requestReport<string>(body, {
      ...options,
      idempotent: options.idempotent ?? true,
    });

    const reportState = response.metadata.reportState ?? "completed";
    if (reportState === "completed") {
      return {
        state: "completed",
        report: response.data,
        metadata: response.metadata,
      };
    }

    return {
      state: reportState,
      report: response.data,
      metadata: response.metadata,
      shouldPoll: true,
      retryInSeconds: response.metadata.polling?.retryInSeconds ?? response.metadata.retryIn,
      reportsInQueue: response.metadata.polling?.reportsInQueue ?? response.metadata.reportsInQueue,
    };
  }

  serviceName(): string {
    return REPORTS_SERVICE;
  }
}
