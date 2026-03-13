# Yandex Direct SDK

This package provides transport/auth primitives and typed Campaigns + AdGroups + Ads + AdImages + Dictionaries + AgencyClients + BidModifiers + Keywords + KeywordBids + Sitelinks service methods for Yandex Direct API v5:

- JSON service endpoint: `/json/v5/{service}`
- Reports endpoint: `/json/v5/reports`
- Ads service methods: `get`, `add`, `update`, `delete`, `suspend`, `resume`, `archive`, `unarchive`, `moderate`
  with broad payload support for `TextAd`, `DynamicTextAd`, `MobileAppAd`, image/builder ads, `ShoppingAd`, and `ListingAd`
- AdImages service methods: `get`, `add`, `delete`
- AgencyClients service methods: `get`, `add`, `update`
- BidModifiers service methods: `get`, `add`, `set`, `delete`
- AdGroups service methods: `get`, `add`, `update`, `delete`
- Dictionaries service methods: `get`, `getGeoRegions`
- KeywordBids service methods: `get`, `set`, `setAuto`
- Keywords service methods: `get`, `add`, `update`, `delete`, `suspend`, `resume`
- Sitelinks service methods: `get`, `add`, `delete`
- Typed client config and request options
- Public client with Campaigns methods: `get`, `add`, `update`, `delete`, `suspend`, `resume`, `archive`, `unarchive`
- Deterministic timeout + retry defaults with idempotent-safe guard
- Safe request/response hooks with secret redaction by default

## Install

```bash
npm install @k-codex/yandex-direct-sdk
```

From this repository checkout:

```bash
npm install
npm run build
```

## Quick Start

```ts
import { YandexDirectClient } from "@k-codex/yandex-direct-sdk";

const client = new YandexDirectClient({
  token: process.env.YANDEX_DIRECT_TOKEN,
  language: "en",
  clientLogin: process.env.YANDEX_DIRECT_CLIENT_LOGIN,
  useOperatorUnits: true,
});

const campaigns = await client.campaigns.get({
  SelectionCriteria: { Ids: [12345] },
  FieldNames: ["Id", "Name", "State"],
});

console.log(campaigns.metadata.requestId);
console.log(campaigns.data.result.Campaigns);
```

## Campaigns Methods

```ts
await client.campaigns.add({
  Campaigns: [
    {
      Name: "Spring sale",
      StartDate: "2026-03-07",
      TextCampaign: { BiddingStrategy: { Search: { BiddingStrategyType: "HIGHEST_POSITION" } } },
    },
  ],
});

await client.campaigns.update({
  Campaigns: [
    {
      Id: 12345,
      Name: "Spring sale updated",
    },
  ],
});

await client.campaigns.delete({ SelectionCriteria: { Ids: [12345] } });
await client.campaigns.suspend({ SelectionCriteria: { Ids: [12345] } });
await client.campaigns.resume({ SelectionCriteria: { Ids: [12345] } });
await client.campaigns.archive({ SelectionCriteria: { Ids: [12345] } });
await client.campaigns.unarchive({ SelectionCriteria: { Ids: [12345] } });

await client.campaigns.get(
  { FieldNames: ["Id", "Name"] },
  { apiVersion: "v501", idempotent: true },
);
```

## Authentication

Provide either a static token or a token provider:

```ts
import { YandexDirectTransport } from "@k-codex/yandex-direct-sdk";

const transport = new YandexDirectTransport({
  tokenProvider: async () => process.env.YANDEX_DIRECT_TOKEN ?? "",
  clientLogin: process.env.YANDEX_DIRECT_CLIENT_LOGIN,
});
```

Token precedence:
1. `tokenProvider()` when defined
2. static `token`

## Public Client Services

```ts
const ads = await client.ads.get({
  SelectionCriteria: { Ids: [10] },
  FieldNames: ["Id", "Type"],
  TextAdFieldNames: ["Title", "Text"],
});

await client.ads.archive({ SelectionCriteria: { Ids: [10] } });

const imageUpload = await client.adImages.add({
  AdImages: [{ ImageData: "<base64>", Name: "Main banner" }],
});

const dictionaries = await client.dictionaries.get({
  DictionaryNames: ["TimeZones", "GeoRegions"],
});

const agencyClients = await client.agencyClients.get({
  FieldNames: ["ClientId", "Login", "ClientInfo"],
});

const keywords = await client.keywords.get({
  SelectionCriteria: { AdGroupIds: [12345] },
  FieldNames: ["Id", "Keyword", "Bid"],
});

const keywordBids = await client.keywordBids.get({
  SelectionCriteria: { KeywordIds: [1] },
  FieldNames: ["KeywordId", "SearchBid"],
});

const bidModifiers = await client.bidModifiers.get({
  SelectionCriteria: { CampaignIds: [12345] },
  FieldNames: ["BidModifierId", "CampaignId"],
});

const sitelinks = await client.sitelinks.get({
  FieldNames: ["Id", "Sitelinks"],
});

const groups = await client.adGroups.get({
  SelectionCriteria: { CampaignIds: [12345] },
  FieldNames: ["Id", "Name", "CampaignId", "Status"],
});

await client.adGroups.delete({
  SelectionCriteria: {
    Ids: groups.data.result.AdGroups.map((group) => group.Id).filter(Boolean),
  },
});

console.log(
  imageUpload.data.result.AddResults,
  dictionaries.data.result.TimeZones,
  agencyClients.data.result.Clients,
  bidModifiers.data.result.BidModifiers,
  keywords.data.result.Keywords,
  keywordBids.data.result.KeywordBids,
  sitelinks.data.result.SitelinksSets,
);
```

## AdGroupsService

```ts
import { AdGroupsService, YandexDirectTransport } from "@k-codex/yandex-direct-sdk";

const transport = new YandexDirectTransport({
  token: process.env.YANDEX_DIRECT_TOKEN,
});

const adGroups = new AdGroupsService(transport);

const getResponse = await adGroups.get({
  SelectionCriteria: { CampaignIds: [12345] },
  FieldNames: ["Id", "Name", "CampaignId", "Status"],
});

await adGroups.delete({
  SelectionCriteria: {
    Ids: getResponse.data.result.AdGroups.map((group) => group.Id).filter(Boolean),
  },
});
```

## Config

```ts
import type { YandexDirectClientConfig } from "@k-codex/yandex-direct-sdk";

const config: YandexDirectClientConfig = {
  token: "<token>",
  // or tokenProvider: async () => getFreshToken(),
  baseUrl: "https://api.direct.yandex.com",
  language: "en",
  clientLogin: "advertiser-login",
  useOperatorUnits: true,
  timeoutMs: 15000,
  retry: {
    maxAttempts: 2,
    baseDelayMs: 200,
    maxDelayMs: 1000,
    backoffFactor: 2,
  },
};
```

## API Versioning

Service requests use `v5` by default. For official `v501` service variants, pass `apiVersion` in request options:

```ts
await client.ads.get(
  {
    SelectionCriteria: { Ids: [1] },
    FieldNames: ["Id", "Type"],
  },
  {
    apiVersion: "v501",
    idempotent: true,
  },
);
```

## Retry Behavior

Default retries are deterministic and run only when `idempotent: true` is set per request.

Transient retry conditions include timeout/network failures and HTTP `408/425/429/500/502/503/504`.

```ts
await client.transport.requestService(
  "campaigns",
  { method: "get", params: { FieldNames: ["Id"] } },
  { idempotent: true },
);
```

## Reports Example

```ts
const report = await transport.requestReport(
  {
    params: {
      SelectionCriteria: {},
      FieldNames: ["Date", "Clicks"],
      ReportName: "Daily clicks",
      ReportType: "ACCOUNT_PERFORMANCE_REPORT",
      DateRangeType: "TODAY",
      Format: "TSV",
    },
  },
  {
    idempotent: true,
    reportHeaders: {
      processingMode: "auto",
      skipReportHeader: true,
      skipColumnHeader: true,
      skipReportSummary: true,
    },
  },
);

console.log(report.metadata.retryIn, report.metadata.reportsInQueue);
console.log(report.data);
```

## Runnable Examples

Set `YANDEX_DIRECT_TOKEN` and optionally `YANDEX_DIRECT_CLIENT_LOGIN`, then run:

```bash
npm run example:basic
npm run example:adgroups
npm run example:reports
```

## Safe Hooks (Redacted by Default)

```ts
const transport = new YandexDirectTransport({
  token: process.env.YANDEX_DIRECT_TOKEN,
  hooks: {
    onRequest(event) {
      // Authorization/token-like fields are already redacted.
      console.log(event.headers, event.body);
    },
    onResponse(event) {
      console.log(event.status, event.metadata.requestId);
    },
    onError(event) {
      console.error(event.errorName, event.errorMessage, event.retryable);
    },
  },
});
```

## Errors

- `SdkError`: stable base class (`code`, `retryable`, `retryReason`)
- `TransportError`: HTTP/network/serialization failures with `status`, `requestId`, `units`, `rawPayload`
- `TimeoutError`: request exceeded timeout (`retryReason: "timeout"`)
- `ApiError`: base envelope error with mapped fields (`error_code`, `error_string`, `error_detail`, `request_id`)
- `ApiBusinessError`: non-auth, non-rate business envelope error
- `AuthError`: auth/authorization failures (`retryable: false`)
- `RateLimitError`: rate-limit/quota failures (`retryable: true`)

Retry logic uses exported `classifyRetryability(...)` for deterministic classification of auth/rate/network/http/API-transient conditions.

## Error Handling

```ts
import { AuthError, RateLimitError, YandexDirectTransport } from "@k-codex/yandex-direct-sdk";

try {
  const transport = new YandexDirectTransport({ token: process.env.YANDEX_DIRECT_TOKEN });
  await transport.requestService("campaigns", { method: "get", params: {} }, { idempotent: true });
} catch (error) {
  if (error instanceof AuthError) {
    console.error("Check token/client permissions:", error.requestId);
  } else if (error instanceof RateLimitError) {
    console.error("Retry with backoff:", error.retryReason, error.requestId);
  } else {
    console.error("Unhandled SDK error:", error);
  }
}
```

## Contributor Validation

```bash
npm run typecheck
npm test
npm run test:contract
```
