import test from "node:test";
import assert from "node:assert/strict";

import {
  AuthError,
  KeywordsService,
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

test("KeywordsService.get validates params and retries as idempotent by default", async () => {
  const requestBodies = [];
  let calls = 0;

  const transport = new YandexDirectTransport({
    token: "token",
    retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0 },
    fetch: async (_url, init) => {
      calls += 1;
      requestBodies.push(JSON.parse(String(init.body)));

      if (calls === 1) {
        return new Response("temporary outage", { status: 503 });
      }

      return jsonResponse({
        result: {
          Keywords: [{ Id: 1, Keyword: "winter tires", Bid: 1200000 }],
        },
      });
    },
  });

  const service = new KeywordsService(transport);
  const response = await service.get({
    SelectionCriteria: { AdGroupIds: [10] },
    FieldNames: ["Id", "Keyword", "Bid"],
    Page: { Limit: 100, Offset: 0 },
  });

  assert.equal(calls, 2);
  assert.equal(requestBodies[0].method, "get");
  assert.deepEqual(requestBodies[0].params.SelectionCriteria, { AdGroupIds: [10] });
  assert.deepEqual(response.data.result.Keywords, [{ Id: 1, Keyword: "winter tires", Bid: 1200000 }]);
});

test("KeywordsService methods map to get/add/update/suspend/resume envelopes", async () => {
  const calledMethods = [];

  const transport = new YandexDirectTransport({
    token: "token",
    fetch: async (_url, init) => {
      const parsedBody = JSON.parse(String(init.body));
      calledMethods.push(parsedBody.method);

      switch (parsedBody.method) {
        case "add":
          return jsonResponse({ result: { AddResults: [{ Id: 501 }] } });
        case "update":
          return jsonResponse({ result: { UpdateResults: [{ Id: 501 }] } });
        case "suspend":
          return jsonResponse({ result: { SuspendResults: [{ Id: 501 }] } });
        case "resume":
          return jsonResponse({ result: { ResumeResults: [{ Id: 501 }] } });
        default:
          throw new Error(`Unexpected method: ${parsedBody.method}`);
      }
    },
  });

  const service = new KeywordsService(transport);

  const add = await service.add({
    Keywords: [{
      Keyword: "winter tires",
      AdGroupId: 44,
      Bid: 1200000,
      ContextBid: 900000,
      StrategyPriority: "HIGH",
      UserParam1: "segment-a",
    }],
  });
  const update = await service.update({
    Keywords: [{
      Id: 501,
      Bid: 1400000,
      StrategyPriority: "NORMAL",
    }],
  });
  const suspend = await service.suspend({
    SelectionCriteria: {
      Ids: [501],
    },
  });
  const resume = await service.resume({
    SelectionCriteria: {
      Ids: [501],
    },
  });

  assert.deepEqual(add.data.result.AddResults, [{ Id: 501 }]);
  assert.deepEqual(update.data.result.UpdateResults, [{ Id: 501 }]);
  assert.deepEqual(suspend.data.result.SuspendResults, [{ Id: 501 }]);
  assert.deepEqual(resume.data.result.ResumeResults, [{ Id: 501 }]);
  assert.deepEqual(calledMethods, ["add", "update", "suspend", "resume"]);
});

test("KeywordsService enforces required selector/entity/ids payloads", async () => {
  const service = new KeywordsService(new YandexDirectTransport({
    token: "token",
    fetch: async () => jsonResponse({ result: {} }),
  }));

  await assert.rejects(
    () => service.get({
      SelectionCriteria: {},
      FieldNames: ["Id"],
    }),
    /at least one of Ids, AdGroupIds, or CampaignIds/,
  );

  await assert.rejects(
    () => service.add({ Keywords: [] }),
    /params.Keywords must be a non-empty array/,
  );

  await assert.rejects(
    () => service.update({
      Keywords: [{ Id: 2 }],
    }),
    /at least one field to update besides Id/,
  );

  await assert.rejects(
    () => service.suspend({
      SelectionCriteria: {
        Ids: [],
      },
    }),
    /at least one ID/,
  );
});

test("KeywordsService propagates mutation failures via shared error mapper", async () => {
  const transport = new YandexDirectTransport({
    token: "token",
    fetch: async () => jsonResponse({
      error: {
        request_id: "req-auth",
        error_code: 53,
        error_string: "Authorization error",
      },
    }),
  });

  const service = new KeywordsService(transport);

  await assert.rejects(
    () => service.update({
      Keywords: [{
        Id: 123,
        Bid: 500000,
      }],
    }),
    (error) => {
      assert.ok(error instanceof AuthError);
      assert.equal(error.requestId, "req-auth");
      return true;
    },
  );
});

test("KeywordsService mutation calls are non-idempotent by default", async () => {
  let calls = 0;
  const service = new KeywordsService(new YandexDirectTransport({
    token: "token",
    retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0 },
    fetch: async () => {
      calls += 1;
      return new Response("temporary outage", { status: 503 });
    },
  }));

  await assert.rejects(
    () => service.add({
      Keywords: [{ Keyword: "abc", AdGroupId: 7 }],
    }),
    (error) => {
      assert.ok(error instanceof TransportError);
      return true;
    },
  );
  assert.equal(calls, 1);
});
