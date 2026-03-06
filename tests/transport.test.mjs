import test from "node:test";
import assert from "node:assert/strict";

import {
  AuthError,
  TimeoutError,
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
  assert.equal(response.metadata.reportState, "completed");
  assert.equal(response.metadata.polling?.shouldPoll, false);
  assert.match(response.data, /Clicks/);
});

test("requestReport maps in-progress response metadata for polling", async () => {
  const transport = new YandexDirectTransport({
    token: "token",
    fetch: async () => new Response("Report is being generated", {
      status: 202,
      headers: {
        "content-type": "text/plain",
        retryIn: "30",
        reportsInQueue: "4",
      },
    }),
  });

  const response = await transport.requestReport(
    { params: { DateRangeType: "TODAY" } },
    { idempotent: true },
  );

  assert.equal(response.metadata.reportState, "in-progress");
  assert.equal(response.metadata.polling?.shouldPoll, true);
  assert.equal(response.metadata.polling?.retryInSeconds, 30);
  assert.equal(response.metadata.polling?.reportsInQueue, 4);
  assert.match(response.data, /being generated/);
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

test("requestReport maps JSON error envelopes to AuthError", async () => {
  const transport = new YandexDirectTransport({
    token: "token",
    fetch: async () => jsonResponse({
      error: {
        request_id: "report-auth",
        error_code: 53,
        error_string: "Authorization error",
        error_detail: "Token is invalid",
      },
    }, { status: 401 }),
  });

  await assert.rejects(
    () => transport.requestReport(
      { params: { DateRangeType: "TODAY" } },
      { idempotent: true },
    ),
    (error) => {
      assert.ok(error instanceof AuthError);
      assert.equal(error.requestId, "report-auth");
      return true;
    },
  );
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
