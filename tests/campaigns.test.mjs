import test from "node:test";
import assert from "node:assert/strict";

import {
  AuthError,
  TransportError,
  YandexDirectClient,
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

test("public client exposes campaigns, ads, and adGroups services", () => {
  const client = new YandexDirectClient({
    token: "token",
    fetch: async () => jsonResponse({ result: {} }),
  });

  assert.equal(typeof client.ads.get, "function");
  assert.equal(typeof client.adGroups.get, "function");
  assert.equal(typeof client.campaigns.get, "function");
  assert.equal(typeof client.campaigns.add, "function");
  assert.equal(typeof client.campaigns.update, "function");
  assert.equal(typeof client.campaigns.delete, "function");
  assert.equal(typeof client.campaigns.suspend, "function");
  assert.equal(typeof client.campaigns.resume, "function");
  assert.equal(typeof client.campaigns.archive, "function");
  assert.equal(typeof client.campaigns.unarchive, "function");
});

test("CampaignsService methods return typed envelopes for all supported operations", async () => {
  const seenMethods = [];

  const client = new YandexDirectClient({
    token: "token",
    fetch: async (_url, init) => {
      const body = JSON.parse(init.body);
      seenMethods.push(body.method);

      switch (body.method) {
        case "get":
          return jsonResponse({ result: { Campaigns: [{ Id: 1, Name: "Test" }] } });
        case "add":
          return jsonResponse({ result: { AddResults: [{ Id: 1 }] } });
        case "update":
          return jsonResponse({ result: { UpdateResults: [{ Id: 1 }] } });
        case "delete":
          return jsonResponse({ result: { DeleteResults: [{ Id: 1 }] } });
        case "suspend":
          return jsonResponse({ result: { SuspendResults: [{ Id: 1 }] } });
        case "resume":
          return jsonResponse({ result: { ResumeResults: [{ Id: 1 }] } });
        case "archive":
          return jsonResponse({ result: { ArchiveResults: [{ Id: 1 }] } });
        case "unarchive":
          return jsonResponse({ result: { UnarchiveResults: [{ Id: 1 }] } });
        default:
          throw new Error(`Unexpected method: ${body.method}`);
      }
    },
  });

  const getResult = await client.campaigns.get({ FieldNames: ["Id", "Name"] });
  const addResult = await client.campaigns.add({
    Campaigns: [
      {
        Name: "Campaign",
        StartDate: "2026-03-06",
        TextCampaign: {},
      },
    ],
  });
  const updateResult = await client.campaigns.update({
    Campaigns: [
      {
        Id: 1,
        Name: "Updated",
      },
    ],
  });
  const deleteResult = await client.campaigns.delete({ SelectionCriteria: { Ids: [1] } });
  const suspendResult = await client.campaigns.suspend({ SelectionCriteria: { Ids: [1] } });
  const resumeResult = await client.campaigns.resume({ SelectionCriteria: { Ids: [1] } });
  const archiveResult = await client.campaigns.archive({ SelectionCriteria: { Ids: [1] } });
  const unarchiveResult = await client.campaigns.unarchive({ SelectionCriteria: { Ids: [1] } });

  assert.deepEqual(
    seenMethods,
    ["get", "add", "update", "delete", "suspend", "resume", "archive", "unarchive"],
  );
  assert.equal(getResult.data.result.Campaigns[0].Id, 1);
  assert.equal(addResult.data.result.AddResults[0].Id, 1);
  assert.equal(updateResult.data.result.UpdateResults[0].Id, 1);
  assert.equal(deleteResult.data.result.DeleteResults[0].Id, 1);
  assert.equal(suspendResult.data.result.SuspendResults[0].Id, 1);
  assert.equal(resumeResult.data.result.ResumeResults[0].Id, 1);
  assert.equal(archiveResult.data.result.ArchiveResults[0].Id, 1);
  assert.equal(unarchiveResult.data.result.UnarchiveResults[0].Id, 1);
});

test("required params are validated for get/add/update/delete/suspend/resume/archive/unarchive", async () => {
  const client = new YandexDirectClient({
    token: "token",
    fetch: async () => jsonResponse({ result: {} }),
  });

  await assert.rejects(
    () => client.campaigns.get({ FieldNames: [] }),
    /params\.FieldNames must be a non-empty array of strings/,
  );

  await assert.rejects(
    () => client.campaigns.add({
      Campaigns: [{ Name: "A", StartDate: "2026-03-06" }],
    }),
    /at least one campaign subtype payload/,
  );

  await assert.rejects(
    () => client.campaigns.update({ Campaigns: [{ Name: "No id" }] }),
    /params\.Campaigns\[0\]\.Id must be a positive integer/,
  );

  await assert.rejects(
    () => client.campaigns.suspend({ SelectionCriteria: { Ids: [] } }),
    /params\.SelectionCriteria\.Ids must include at least one id/,
  );

  await assert.rejects(
    () => client.campaigns.resume({ SelectionCriteria: { Ids: [0] } }),
    /positive integer/,
  );

  await assert.rejects(
    () => client.campaigns.delete({ SelectionCriteria: { Ids: [] } }),
    /params\.SelectionCriteria\.Ids must include at least one id/,
  );

  await assert.rejects(
    () => client.campaigns.archive({ SelectionCriteria: { Ids: [0] } }),
    /positive integer/,
  );

  await assert.rejects(
    () => client.campaigns.unarchive({ SelectionCriteria: { Ids: [] } }),
    /params\.SelectionCriteria\.Ids must include at least one id/,
  );
});

test("method-level API auth error mapping is preserved", async () => {
  const client = new YandexDirectClient({
    token: "token",
    fetch: async () => jsonResponse({
      error: {
        request_id: "req-auth",
        error_code: 53,
        error_string: "Authorization error",
        error_detail: "Invalid token",
      },
    }),
  });

  const checks = [
    () => client.campaigns.get({ FieldNames: ["Id"] }),
    () => client.campaigns.add({
      Campaigns: [{ Name: "A", StartDate: "2026-03-06", TextCampaign: {} }],
    }),
    () => client.campaigns.update({ Campaigns: [{ Id: 1 }] }),
    () => client.campaigns.delete({ SelectionCriteria: { Ids: [1] } }),
    () => client.campaigns.suspend({ SelectionCriteria: { Ids: [1] } }),
    () => client.campaigns.resume({ SelectionCriteria: { Ids: [1] } }),
    () => client.campaigns.archive({ SelectionCriteria: { Ids: [1] } }),
    () => client.campaigns.unarchive({ SelectionCriteria: { Ids: [1] } }),
  ];

  for (const run of checks) {
    await assert.rejects(
      run,
      (error) => {
        assert.ok(error instanceof AuthError);
        assert.equal(error.requestId, "req-auth");
        return true;
      },
    );
  }
});

test("retry-safe defaults: suspend retries, add does not retry", async () => {
  let suspendCalls = 0;
  const suspendClient = new YandexDirectClient({
    token: "token",
    retry: {
      maxAttempts: 2,
      baseDelayMs: 0,
      maxDelayMs: 0,
    },
    fetch: async () => {
      suspendCalls += 1;
      if (suspendCalls === 1) {
        return jsonResponse({}, { status: 503 });
      }
      return jsonResponse({ result: { SuspendResults: [{ Id: 1 }] } });
    },
  });

  const suspendResponse = await suspendClient.campaigns.suspend({
    SelectionCriteria: { Ids: [1] },
  });

  assert.equal(suspendCalls, 2);
  assert.equal(suspendResponse.data.result.SuspendResults[0].Id, 1);

  let addCalls = 0;
  const addClient = new YandexDirectClient({
    token: "token",
    retry: {
      maxAttempts: 2,
      baseDelayMs: 0,
      maxDelayMs: 0,
    },
    fetch: async () => {
      addCalls += 1;
      return jsonResponse({}, { status: 503 });
    },
  });

  await assert.rejects(
    () => addClient.campaigns.add({
      Campaigns: [{ Name: "A", StartDate: "2026-03-06", TextCampaign: {} }],
    }),
    (error) => {
      assert.ok(error instanceof TransportError);
      return true;
    },
  );

  assert.equal(addCalls, 1);
});
