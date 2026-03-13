import test from "node:test";
import assert from "node:assert/strict";

import {
  KeywordsService,
  YandexDirectClient,
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

test("public client exposes keywords service", () => {
  const client = new YandexDirectClient({
    token: "token",
    fetch: async () => jsonResponse({ result: {} }),
  });

  assert.equal(typeof client.keywords.get, "function");
  assert.equal(typeof client.keywords.add, "function");
  assert.equal(typeof client.keywords.update, "function");
  assert.equal(typeof client.keywords.delete, "function");
  assert.equal(typeof client.keywords.suspend, "function");
  assert.equal(typeof client.keywords.resume, "function");
});

test("KeywordsService maps get/add/update/delete/suspend/resume methods", async () => {
  const methods = [];
  const service = new KeywordsService(new YandexDirectTransport({
    token: "token",
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init.body));
      methods.push(body.method);

      switch (body.method) {
        case "get":
          return jsonResponse({ result: { Keywords: [{ Id: 1, Keyword: "buy shoes" }] } });
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
        default:
          throw new Error(`Unexpected method: ${body.method}`);
      }
    },
  }));

  const getResult = await service.get({
    SelectionCriteria: { AdGroupIds: [10] },
    FieldNames: ["Id", "Keyword"],
  });
  const addResult = await service.add({
    Keywords: [{ Keyword: "buy shoes", AdGroupId: 10 }],
  });
  const updateResult = await service.update({
    Keywords: [{ Id: 1, Keyword: "buy red shoes" }],
  });
  const deleteResult = await service.delete({ SelectionCriteria: { Ids: [1] } });
  const suspendResult = await service.suspend({ SelectionCriteria: { Ids: [1] } });
  const resumeResult = await service.resume({ SelectionCriteria: { Ids: [1] } });

  assert.deepEqual(methods, ["get", "add", "update", "delete", "suspend", "resume"]);
  assert.equal(getResult.data.result.Keywords[0].Keyword, "buy shoes");
  assert.equal(addResult.data.result.AddResults[0].Id, 1);
  assert.equal(updateResult.data.result.UpdateResults[0].Id, 1);
  assert.equal(deleteResult.data.result.DeleteResults[0].Id, 1);
  assert.equal(suspendResult.data.result.SuspendResults[0].Id, 1);
  assert.equal(resumeResult.data.result.ResumeResults[0].Id, 1);
});

test("KeywordsService validates required params", async () => {
  const service = new KeywordsService(new YandexDirectTransport({
    token: "token",
    fetch: async () => jsonResponse({ result: {} }),
  }));

  await assert.rejects(
    () => service.get({ SelectionCriteria: {}, FieldNames: ["Id"] }),
    /must include at least one of Ids, AdGroupIds, or CampaignIds/,
  );

  await assert.rejects(
    () => service.add({ Keywords: [] }),
    /params\.Keywords must be a non-empty array/,
  );

  await assert.rejects(
    () => service.update({ Keywords: [{ Id: 1 }] }),
    /at least one field to update besides Id/,
  );

  await assert.rejects(
    () => service.delete({ SelectionCriteria: { Ids: [] } }),
    /params\.SelectionCriteria\.Ids must include at least one id/,
  );
});
