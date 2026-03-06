import { SdkError } from "../errors.js";
import { SUPPORTED_AD_FORMAT_KEYS } from "./types.js";

export type UnsupportedAdFormatReason = "missing" | "unsupported" | "ambiguous";

export class UnsupportedAdFormatError extends SdkError {
  readonly reason: UnsupportedAdFormatReason;
  readonly receivedFormat?: string;
  readonly supportedFormats: readonly string[];

  constructor(options: {
    reason: UnsupportedAdFormatReason;
    receivedFormat?: string;
    message?: string;
  }) {
    super(
      options.message
      ?? `Unsupported ad format in Ads service: ${options.receivedFormat ?? "unknown format"}. Supported formats: ${SUPPORTED_AD_FORMAT_KEYS.join(", ")}.`,
      "UNSUPPORTED_AD_FORMAT",
      false,
    );
    this.reason = options.reason;
    this.receivedFormat = options.receivedFormat;
    this.supportedFormats = SUPPORTED_AD_FORMAT_KEYS;
  }
}
