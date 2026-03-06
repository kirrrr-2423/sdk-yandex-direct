import test from "node:test";
import assert from "node:assert/strict";

import {
  AdGroupsService,
  AuthError,
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

test("AdGroupsService.get validates params and retries as idempotent by default", async () => {
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
          AdGroups: [{ Id: 1, Name: "Main group" }],
        },
      });
    },
  });

  const service = new AdGroupsService(transport);
  const response = await service.get({
    SelectionCriteria: { CampaignIds: [10] },
    FieldNames: ["Id", "Name"],
    Page: { Limit: 100, Offset: 0 },
  });

  assert.equal(calls, 2);
  assert.equal(requestBodies[0].method, "get");
  assert.deepEqual(requestBodies[0].params.SelectionCriteria, { CampaignIds: [10] });
  assert.deepEqual(response.data.result.AdGroups, [{ Id: 1, Name: "Main group" }]);
});

test("AdGroupsService methods map to get/add/update/suspend/resume envelopes", async () => {
  const calledMethods = [];

  const transport = new YandexDirectTransport({
    token: "token",
    fetch: async (_url, init) => {
      const parsedBody = JSON.parse(String(init.body));
      calledMethods.push(parsedBody.method);

      switch (parsedBody.method) {
        case "add":
          return jsonResponse({ result: { AddResults: [{ Id: 101 }] } });
        case "update":
          return jsonResponse({ result: { UpdateResults: [{ Id: 101 }] } });
        case "suspend":
          return jsonResponse({ result: { SuspendResults: [{ Id: 101 }] } });
        case "resume":
          return jsonResponse({ result: { ResumeResults: [{ Id: 101 }] } });
        default:
          throw new Error(`Unexpected method: ${parsedBody.method}`);
      }
    },
  });

  const service = new AdGroupsService(transport);

  const add = await service.add({
    AdGroups: [{
      Name: "Group 1",
      CampaignId: 44,
      RegionIds: [0],
    }],
  });
  const update = await service.update({
    AdGroups: [{
      Id: 101,
      Name: "Group 1 updated",
    }],
  });
  const suspend = await service.suspend({
    SelectionCriteria: {
      Ids: [101],
    },
  });
  const resume = await service.resume({
    SelectionCriteria: {
      Ids: [101],
    },
  });

  assert.deepEqual(add.data.result.AddResults, [{ Id: 101 }]);
  assert.deepEqual(update.data.result.UpdateResults, [{ Id: 101 }]);
  assert.deepEqual(suspend.data.result.SuspendResults, [{ Id: 101 }]);
  assert.deepEqual(resume.data.result.ResumeResults, [{ Id: 101 }]);
  assert.deepEqual(calledMethods, ["add", "update", "suspend", "resume"]);
});

test("AdGroupsService enforces required params for selector/entity/ids payloads", async () => {
  const service = new AdGroupsService(new YandexDirectTransport({
    token: "token",
    fetch: async () => jsonResponse({ result: {} }),
  }));

  await assert.rejects(
    () => service.get({
      SelectionCriteria: {},
      FieldNames: ["Id"],
    }),
    /at least one of Ids or CampaignIds/,
  );

  await assert.rejects(
    () => service.add({ AdGroups: [] }),
    /params.AdGroups must be a non-empty array/,
  );

  await assert.rejects(
    () => service.update({
      AdGroups: [{ Id: 2 }],
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

test("AdGroupsService propagates envelope failures via shared error mapper", async () => {
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

  const service = new AdGroupsService(transport);

  await assert.rejects(
    () => service.resume({ SelectionCriteria: { Ids: [123] } }),
    (error) => {
      assert.ok(error instanceof AuthError);
      assert.equal(error.requestId, "req-auth");
      return true;
    },
  );
});
