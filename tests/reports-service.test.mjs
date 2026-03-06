import test from "node:test";
import assert from "node:assert/strict";

import {
  ReportsService,
  YandexDirectTransport,
  buildReportRequest,
  isReportPending,
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

function createBaseReport() {
  return {
    SelectionCriteria: {},
    FieldNames: ["Date", "Clicks"],
    ReportName: "Daily performance",
    ReportType: "ACCOUNT_PERFORMANCE_REPORT",
    DateRangeType: "TODAY",
    Format: "TSV",
    IncludeVAT: "NO",
  };
}

test("buildReportRequest validates required report fields", () => {
  const request = buildReportRequest(createBaseReport());
  assert.equal(request.params.ReportName, "Daily performance");
  assert.equal(request.params.DateRangeType, "TODAY");

  assert.throws(
    () => buildReportRequest({
      ...createBaseReport(),
      IncludeVAT: "MAYBE",
    }),
    /must be either YES or NO/,
  );

  assert.throws(
    () => buildReportRequest({
      ...createBaseReport(),
      DateRangeType: "CUSTOM_DATE",
    }),
    /DateFrom and report.SelectionCriteria.DateTo are required/,
  );
});

test("ReportsService.create returns completed report payload for status 200", async () => {
  const service = new ReportsService(new YandexDirectTransport({
    token: "token",
    fetch: async () => new Response("Date\tClicks\n2026-03-06\t11", {
      status: 200,
      headers: {
        "content-type": "text/tab-separated-values",
        RequestId: "report-200",
      },
    }),
  }));

  const response = await service.create(createBaseReport());
  assert.equal(response.state, "completed");
  assert.equal(response.metadata.requestId, "report-200");
  assert.match(response.report, /Clicks/);
  assert.equal(isReportPending(response), false);
});

test("ReportsService.create exposes queued/in-progress states with retry hints", async () => {
  let call = 0;
  const service = new ReportsService(new YandexDirectTransport({
    token: "token",
    fetch: async () => {
      call += 1;
      if (call === 1) {
        return new Response("Report queued", {
          status: 201,
          headers: {
            "content-type": "text/plain",
            retryIn: "7",
            reportsInQueue: "3",
          },
        });
      }

      return new Response("Report in progress", {
        status: 202,
        headers: {
          "content-type": "text/plain",
          retryIn: "5",
          reportsInQueue: "2",
        },
      });
    },
  }));

  const queued = await service.create(createBaseReport());
  assert.equal(queued.state, "queued");
  assert.equal(queued.shouldPoll, true);
  assert.equal(queued.retryInSeconds, 7);
  assert.equal(queued.reportsInQueue, 3);
  assert.equal(isReportPending(queued), true);

  const inProgress = await service.create(createBaseReport());
  assert.equal(inProgress.state, "in-progress");
  assert.equal(inProgress.shouldPoll, true);
  assert.equal(inProgress.retryInSeconds, 5);
  assert.equal(inProgress.reportsInQueue, 2);
});

test("ReportsService requests are idempotent by default for retry safety", async () => {
  let calls = 0;
  const service = new ReportsService(new YandexDirectTransport({
    token: "token",
    retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0 },
    fetch: async () => {
      calls += 1;
      if (calls === 1) {
        return new Response("temporary outage", { status: 503 });
      }
      return jsonResponse({ result: { ok: true } }, {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    },
  }));

  const response = await service.create(createBaseReport());
  assert.equal(calls, 2);
  assert.equal(response.state, "completed");
});
