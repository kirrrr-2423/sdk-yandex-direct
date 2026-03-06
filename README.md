# Yandex Direct SDK

This package provides transport/auth primitives and a typed Campaigns service for Yandex Direct API v5:

- JSON service endpoint: `/json/v5/{service}`
- Reports endpoint: `/json/v5/reports`
- Typed client config and request options
- Public client with Campaigns MVP methods: `get`, `add`, `update`, `suspend`, `resume`
- Deterministic timeout + retry defaults with idempotent-safe guard
- Safe request/response hooks with secret redaction by default

## Install

```bash
npm install @k-codex/yandex-direct-sdk
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

## Campaigns MVP Methods

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

await client.campaigns.suspend({ SelectionCriteria: { Ids: [12345] } });
await client.campaigns.resume({ SelectionCriteria: { Ids: [12345] } });
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

Token precedence:
1. `tokenProvider()` when defined
2. static `token`

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

- `TransportError`: non-business transport/HTTP failure
- `TimeoutError`: request exceeded timeout
- `ApiError`: Yandex envelope error
- `AuthError`: auth/authorization failures
- `RateLimitError`: rate-limit/quota failures (retryable)
