import test from "node:test";
import assert from "node:assert/strict";

import {
  ApiBusinessError,
  AuthError,
  TimeoutError,
  TransportError,
  classifyRetryability,
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

test("requestService composes headers and returns metadata", async () => {
  let captured = null;

  const transport = new YandexDirectTransport({
    token: "very-secret",
    language: "ru",
    clientLogin: "agency-client",
    useOperatorUnits: true,
    headerProvider: () => ({ "X-Correlation-Id": "abc-1" }),
    fetch: async (url, init) => {
      captured = { url, init };
      return jsonResponse(
        { result: { ok: true } },
        {
          headers: {
            RequestId: "req-42",
            Units: "1/2/3",
            "Units-Used-Login": "agency-client",
          },
        },
      );
    },
  });

  const response = await transport.requestService("campaigns", {
    method: "get",
    params: { page: 1 },
  });

  assert.equal(captured.url, "https://api.direct.yandex.com/json/v5/campaigns");
  const headers = new Headers(captured.init.headers);
  assert.equal(headers.get("authorization"), "Bearer very-secret");
  assert.equal(headers.get("accept-language"), "ru");
  assert.equal(headers.get("client-login"), "agency-client");
  assert.equal(headers.get("use-operator-units"), "true");
  assert.equal(headers.get("x-correlation-id"), "abc-1");

  assert.equal(response.metadata.requestId, "req-42");
  assert.deepEqual(response.metadata.units, {
    raw: "1/2/3",
    spent: 1,
    remaining: 2,
    limit: 3,
  });
  assert.equal(response.metadata.unitsUsedLogin, "agency-client");
});

test("requestService supports explicit API version override for official v501 services", async () => {
  let captured = null;

  const transport = new YandexDirectTransport({
    token: "very-secret",
    fetch: async (url, init) => {
      captured = { url, init };
      return jsonResponse({ result: { ok: true } });
    },
  });

  await transport.requestService(
    "ads",
    { method: "get", params: { SelectionCriteria: { Ids: [1] }, FieldNames: ["Id"] } },
    { apiVersion: "v501", idempotent: true },
  );

  assert.equal(captured.url, "https://api.direct.yandex.com/json/v501/ads");
});

test("idempotent retry guard allows retries only when enabled", async () => {
  let nonIdempotentCalls = 0;
  const nonIdempotentTransport = new YandexDirectTransport({
    token: "token",
    fetch: async () => {
      nonIdempotentCalls += 1;
      return new Response("temporary outage", { status: 503 });
    },
    retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0 },
  });

  await assert.rejects(
    () => nonIdempotentTransport.requestService("campaigns", { method: "get" }, { idempotent: false }),
    (error) => {
      assert.ok(error instanceof TransportError);
      return true;
    },
  );
  assert.equal(nonIdempotentCalls, 1);

  let idempotentCalls = 0;
  const idempotentTransport = new YandexDirectTransport({
    token: "token",
    fetch: async () => {
      idempotentCalls += 1;
      if (idempotentCalls === 1) {
        return new Response("temporary outage", { status: 503 });
      }
      return jsonResponse({ result: { ok: true } });
    },
    retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0 },
  });

  const result = await idempotentTransport.requestService(
    "campaigns",
    { method: "get" },
    { idempotent: true },
  );
  assert.deepEqual(result.data, { result: { ok: true } });
  assert.equal(idempotentCalls, 2);
});

test("timeout is mapped to TimeoutError", async () => {
  const transport = new YandexDirectTransport({
    token: "token",
    timeoutMs: 10,
    retry: { maxAttempts: 1 },
    fetch: (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      });
    }),
  });

  await assert.rejects(
    () => transport.requestService("campaigns", { method: "get" }),
    (error) => {
      assert.ok(error instanceof TimeoutError);
      return true;
    },
  );
});

test("requestReport applies report headers and exposes queue metadata", async () => {
  let requestHeaders = null;

  const transport = new YandexDirectTransport({
    token: "token",
    fetch: async (_url, init) => {
      requestHeaders = new Headers(init.headers);
      return new Response("Date\tClicks\n2026-03-01\t10", {
        status: 200,
        headers: {
          "content-type": "text/tab-separated-values",
          RequestId: "report-1",
          retryIn: "5",
          reportsInQueue: "2",
        },
      });
    },
  });

  const response = await transport.requestReport(
    { params: { DateRangeType: "TODAY" } },
    {
      reportHeaders: {
        processingMode: "auto",
        returnMoneyInMicros: true,
        skipReportHeader: true,
      },
    },
  );

  assert.equal(requestHeaders.get("processingmode"), "auto");
  assert.equal(requestHeaders.get("returnmoneyinmicros"), "true");
  assert.equal(requestHeaders.get("skipreportheader"), "true");
  assert.equal(response.metadata.retryIn, 5);
  assert.equal(response.metadata.reportsInQueue, 2);
  assert.match(response.data, /Clicks/);
});

test("API auth failures map to AuthError", async () => {
  const transport = new YandexDirectTransport({
    token: "bad-token",
    fetch: async () => jsonResponse({
      error: {
        request_id: "abc",
        error_code: 53,
        error_string: "Authorization error",
        error_detail: "Token is invalid",
      },
    }),
  });

  await assert.rejects(
    () => transport.requestService("campaigns", { method: "get" }, { idempotent: true }),
    (error) => {
      assert.ok(error instanceof AuthError);
      assert.equal(error.requestId, "abc");
      return true;
    },
  );
});

test("API business failures map to ApiBusinessError with sanitized raw payload", async () => {
  const transport = new YandexDirectTransport({
    token: "token",
    fetch: async () => jsonResponse({
      error: {
        request_id: "req-business-1",
        error_code: 1000,
        error_string: "Temporary backend failure, retry later",
        error_detail: "Please retry the request later",
      },
      debug: {
        trace: "Bearer sdk-secret-token",
        access_token: "should-not-leak",
        hint: "retry",
      },
    }),
  });

  await assert.rejects(
    () => transport.requestService("campaigns", { method: "get" }, { idempotent: true }),
    (error) => {
      assert.ok(error instanceof ApiBusinessError);
      assert.equal(error.retryable, true);
      assert.equal(error.retryReason, "api_transient");
      assert.equal(error.requestId, "req-business-1");
      assert.equal(error.errorDetail, "Please retry the request later");
      assert.equal(error.rawPayload.debug.trace, "Bearer <redacted>");
      assert.equal(error.rawPayload.debug.access_token, "<redacted>");
      return true;
    },
  );
});

test("classifyRetryability handles auth/rate/network/http/api cases", () => {
  assert.deepEqual(classifyRetryability({ status: 401 }), {
    retryable: false,
    reason: "auth",
  });
  assert.deepEqual(classifyRetryability({ status: 429 }), {
    retryable: true,
    reason: "rate_limit",
  });
  assert.deepEqual(classifyRetryability({ cause: { code: "ECONNRESET" } }), {
    retryable: true,
    reason: "network_transient",
  });
  assert.deepEqual(classifyRetryability({ status: 503 }), {
    retryable: true,
    reason: "http_transient",
  });
  assert.deepEqual(classifyRetryability({ errorString: "Temporary outage, retry later" }), {
    retryable: true,
    reason: "api_transient",
  });
  assert.deepEqual(classifyRetryability({ errorString: "Validation failed" }), {
    retryable: false,
    reason: "not_retryable",
  });
});

test("hooks receive redacted request/response payloads", async () => {
  const events = {
    request: null,
    response: null,
  };

  const transport = new YandexDirectTransport({
    token: "token-secret",
    hooks: {
      onRequest: (event) => {
        events.request = event;
      },
      onResponse: (event) => {
        events.response = event;
      },
    },
    fetch: async () => jsonResponse({
      result: {
        token: "server-token",
        nested: { password: "hidden" },
      },
    }),
  });

  await transport.requestService("campaigns", {
    method: "get",
    params: {
      token: "body-token",
      criteria: "all",
    },
  });

  assert.equal(events.request.headers.Authorization, "<redacted>");
  assert.equal(events.request.body.params.token, "<redacted>");
  assert.equal(events.response.body.result.token, "<redacted>");
  assert.equal(events.response.body.result.nested.password, "<redacted>");
});
