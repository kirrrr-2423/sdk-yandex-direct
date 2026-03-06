# Yandex Direct SDK (Core Transport/Auth)

This package provides transport/auth primitives and typed AdGroups service methods for Yandex Direct API v5:

- JSON service endpoint: `/json/v5/{service}`
- Reports endpoint: `/json/v5/reports`
- AdGroups service MVP: `get`, `add`, `update`, `suspend`, `resume`
- Typed client config and request options
- Deterministic timeout + retry defaults with idempotent-safe guard
- Safe request/response hooks with secret redaction by default

## Install

```bash
npm install @k-codex/yandex-direct-sdk
```

## Quick Start

```ts
import { YandexDirectTransport } from "@k-codex/yandex-direct-sdk";

const transport = new YandexDirectTransport({
  token: process.env.YANDEX_DIRECT_TOKEN,
  language: "en",
  clientLogin: process.env.YANDEX_DIRECT_CLIENT_LOGIN,
  useOperatorUnits: true,
});

const campaigns = await transport.requestService("campaigns", {
  method: "get",
  params: {
    SelectionCriteria: {},
    FieldNames: ["Id", "Name"],
  },
});

console.log(campaigns.metadata.requestId);
console.log(campaigns.data);
```

## AdGroupsService (MVP)

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

await adGroups.suspend({
  SelectionCriteria: {
    Ids: getResponse.data.result.AdGroups.map((group) => group.Id).filter(Boolean),
  },
});

await adGroups.resume({
  SelectionCriteria: {
    Ids: [111, 222],
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

Token precedence:
1. `tokenProvider()` when defined
2. static `token`

## Retry Behavior

Default retries are deterministic and run only when `idempotent: true` is set per request.

Transient retry conditions include timeout/network failures and HTTP `408/425/429/500/502/503/504`.

```ts
await transport.requestService(
  "campaigns",
  { method: "get", params: {} },
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
