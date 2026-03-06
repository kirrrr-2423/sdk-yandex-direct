import test from "node:test";
import assert from "node:assert/strict";

import {
  AdGroupsService,
  AuthError,
  TransportError,
  YandexDirectTransport,
} from "../dist/index.js";

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

test("service envelope keeps JSON-RPC shape and tokenProvider takes precedence", async () => {
  let authHeader = null;
  const transport = new YandexDirectTransport({
    token: "fallback-token",
    tokenProvider: async () => "provider-token",
    fetch: async (_url, init) => {
      authHeader = new Headers(init.headers).get("authorization");
      return jsonResponse({
        result: {
          Campaigns: [{ Id: 1, Name: "Main" }],
        },
        warnings: [{ Message: "Read-only field omitted" }],
        meta: { traceId: "trace-1" },
      }, {
        headers: {
          RequestId: "req-contract-1",
        },
      });
    },
  });

  const response = await transport.requestService("campaigns", {
    method: "get",
    params: {
      SelectionCriteria: {},
      FieldNames: ["Id", "Name"],
    },
  }, {
    idempotent: true,
  });

  assert.equal(authHeader, "Bearer provider-token");
  assert.deepEqual(response.data.result.Campaigns, [{ Id: 1, Name: "Main" }]);
  assert.deepEqual(response.data.warnings, [{ Message: "Read-only field omitted" }]);
  assert.deepEqual(response.data.meta, { traceId: "trace-1" });
  assert.equal(response.metadata.requestId, "req-contract-1");
});

test("AdGroupsService integrates with transport and preserves method envelope", async () => {
  const captured = {
    url: null,
    method: null,
  };

  const transport = new YandexDirectTransport({
    token: "token",
    fetch: async (url, init) => {
      captured.url = String(url);
      captured.method = JSON.parse(String(init.body)).method;
      return jsonResponse({
        result: {
          AdGroups: [{ Id: 10, Name: "Contract Group" }],
        },
      });
    },
  });

  const service = new AdGroupsService(transport);
  const response = await service.get({
    SelectionCriteria: { CampaignIds: [123] },
    FieldNames: ["Id", "Name"],
  });

  assert.equal(captured.url, "https://api.direct.yandex.com/json/v5/adgroups");
  assert.equal(captured.method, "get");
  assert.deepEqual(response.data.result.AdGroups, [{ Id: 10, Name: "Contract Group" }]);
});

test("reports endpoint supports queue-compatible text payloads", async () => {
  const transport = new YandexDirectTransport({
    token: "token",
    fetch: async (_url, init) => {
      const headers = new Headers(init.headers);
      assert.equal(headers.get("processingmode"), "auto");
      assert.equal(headers.get("skipreportsummary"), "true");

      return new Response("Date\tClicks\n2026-03-01\t12", {
        status: 201,
        headers: {
          "content-type": "text/tab-separated-values",
          RequestId: "report-contract-1",
          retryIn: "3",
          reportsInQueue: "5",
        },
      });
    },
  });

  const response = await transport.requestReport(
    { params: { DateRangeType: "TODAY" } },
    {
      idempotent: true,
      reportHeaders: {
        processingMode: "auto",
        skipReportSummary: true,
      },
    },
  );

  assert.equal(response.metadata.requestId, "report-contract-1");
  assert.equal(response.metadata.retryIn, 3);
  assert.equal(response.metadata.reportsInQueue, 5);
  assert.match(response.data, /Clicks/);
});

test("reports JSON error envelopes map into SDK auth errors", async () => {
  const transport = new YandexDirectTransport({
    token: "bad-token",
    fetch: async () => jsonResponse({
      error: {
        request_id: "report-auth-1",
        error_code: 53,
        error_string: "Authorization error",
        error_detail: "Token is invalid",
      },
    }),
  });

  await assert.rejects(
    () => transport.requestReport(
      { params: { DateRangeType: "TODAY" } },
      { idempotent: true },
    ),
    (error) => {
      assert.ok(error instanceof AuthError);
      assert.equal(error.requestId, "report-auth-1");
      return true;
    },
  );
});

test("service success must be JSON envelope; non-JSON success fails deterministically", async () => {
  const transport = new YandexDirectTransport({
    token: "token",
    fetch: async () => new Response("ok", {
      status: 200,
      headers: {
        "content-type": "text/plain",
      },
    }),
  });

  await assert.rejects(
    () => transport.requestService("campaigns", { method: "get" }),
    (error) => {
      assert.ok(error instanceof TransportError);
      assert.match(error.message, /Failed to parse JSON response/);
      return true;
    },
  );
});
