import type {
  ApiMessage,
  DeleteMutationResult,
  FieldNames,
  PaginationPage,
  YandexDirectId,
} from "../shared/contracts.js";

type ExtensibleLiteral<T extends string> = T | (string & {});

export type YesNo = "YES" | "NO" | (string & {});

export type AdImageType = ExtensibleLiteral<
  "SMALL" | "REGULAR" | "WIDE" | "FIXED_IMAGE" | "UNFIT"
>;

export type AdImageAddType = ExtensibleLiteral<
  "REGULAR" | "WIDE" | "FIXED_IMAGE" | "AUTO"
>;

export type AdImageSubtype = ExtensibleLiteral<
  | "IMG_240_400"
  | "IMG_300_250"
  | "IMG_300_500"
  | "IMG_300_600"
  | "IMG_320_50"
  | "IMG_320_100"
  | "IMG_320_480"
  | "IMG_336_280"
  | "IMG_480_320"
  | "IMG_480_800"
  | "IMG_600_500"
  | "IMG_600_1000"
  | "IMG_600_1200"
  | "IMG_640_100"
  | "IMG_640_200"
  | "IMG_640_960"
  | "IMG_672_560"
  | "IMG_720_1200"
  | "IMG_728_90"
  | "IMG_900_750"
  | "IMG_900_1500"
  | "IMG_900_1800"
  | "IMG_960_150"
  | "IMG_960_300"
  | "IMG_960_640"
  | "IMG_960_1440"
  | "IMG_960_1600"
  | "IMG_970_250"
  | "IMG_1008_840"
  | "IMG_1200_1000"
  | "IMG_1200_2000"
  | "IMG_1200_2400"
  | "IMG_1280_200"
  | "IMG_1280_400"
  | "IMG_1280_1920"
  | "IMG_1344_1120"
  | "IMG_1440_960"
  | "IMG_1456_180"
  | "IMG_1920_1280"
  | "IMG_1940_500"
  | "IMG_2184_270"
  | "IMG_2910_750"
  | "IMG_2912_360"
  | "IMG_3880_1000"
  | "NONE"
>;

export type AdImageFieldName = ExtensibleLiteral<
  "AdImageHash"
  | "OriginalUrl"
  | "PreviewUrl"
  | "Name"
  | "Type"
  | "Subtype"
  | "Associated"
>;

export interface AdImagesSelectionCriteria {
  AdImageHashes?: readonly string[];
  Associated?: YesNo;
}

export interface AdImagesGetRequest {
  SelectionCriteria?: AdImagesSelectionCriteria;
  FieldNames: readonly AdImageFieldName[];
  Page?: PaginationPage;
}

export interface AdImageGetItem {
  AdImageHash?: string;
  Name?: string;
  Associated?: YesNo;
  Type?: AdImageType;
  Subtype?: AdImageSubtype;
  OriginalUrl?: string | null;
  PreviewUrl?: string | null;
  [key: string]: unknown;
}

export interface AdImagesGetResult {
  AdImages: AdImageGetItem[];
  LimitedBy?: YandexDirectId;
}

export interface AdImageAddItem {
  ImageData: string;
  Name: string;
  Type?: AdImageAddType;
}

export interface AdImagesAddRequest {
  AdImages: readonly AdImageAddItem[];
}

export interface AdImageActionResult {
  AdImageHash?: string;
  Warnings?: ApiMessage[];
  Errors?: ApiMessage[];
}

export interface AdImagesAddResult {
  AddResults: AdImageActionResult[];
}

export interface AdImagesDeleteRequest {
  SelectionCriteria: {
    AdImageHashes: readonly string[];
  };
}

export interface AdImagesDeleteResult extends DeleteMutationResult {
  DeleteResults: AdImageActionResult[];
}

export type AdImageFieldNames = FieldNames<AdImageFieldName>;
