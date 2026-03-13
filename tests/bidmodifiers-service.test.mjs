import test from "node:test";
import assert from "node:assert/strict";

import {
  BidModifiersService,
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

test("public client exposes bidModifiers service", () => {
  const client = new YandexDirectClient({
    token: "token",
    fetch: async () => jsonResponse({ result: {} }),
  });

  assert.equal(typeof client.bidModifiers.get, "function");
  assert.equal(typeof client.bidModifiers.add, "function");
  assert.equal(typeof client.bidModifiers.set, "function");
  assert.equal(typeof client.bidModifiers.delete, "function");
});

test("BidModifiersService maps get/add/set/delete methods", async () => {
  const methods = [];
  const service = new BidModifiersService(new YandexDirectTransport({
    token: "token",
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init.body));
      methods.push(body.method);

      switch (body.method) {
        case "get":
          return jsonResponse({ result: { BidModifiers: [{ BidModifierId: 1, CampaignId: 10 }] } });
        case "add":
          return jsonResponse({ result: { AddResults: [{ Id: 1 }] } });
        case "set":
          return jsonResponse({ result: { UpdateResults: [{ Id: 1 }] } });
        case "delete":
          return jsonResponse({ result: { DeleteResults: [{ Id: 1 }] } });
        default:
          throw new Error(`Unexpected method: ${body.method}`);
      }
    },
  }));

  const getResult = await service.get({
    SelectionCriteria: { CampaignIds: [10] },
    FieldNames: ["BidModifierId", "CampaignId"],
  });
  const addResult = await service.add({
    BidModifiers: [{ CampaignId: 10, MobileAdjustment: { Percent: 110 } }],
  });
  const setResult = await service.set({
    BidModifiers: [{ BidModifierId: 1, MobileAdjustment: { Percent: 90 } }],
  });
  const deleteResult = await service.delete({ SelectionCriteria: { Ids: [1] } });

  assert.deepEqual(methods, ["get", "add", "set", "delete"]);
  assert.equal(getResult.data.result.BidModifiers[0].BidModifierId, 1);
  assert.equal(addResult.data.result.AddResults[0].Id, 1);
  assert.equal(setResult.data.result.UpdateResults[0].Id, 1);
  assert.equal(deleteResult.data.result.DeleteResults[0].Id, 1);
});

test("BidModifiersService validates required params", async () => {
  const service = new BidModifiersService(new YandexDirectTransport({
    token: "token",
    fetch: async () => jsonResponse({ result: {} }),
  }));

  await assert.rejects(
    () => service.get({ SelectionCriteria: {}, FieldNames: ["BidModifierId"] }),
    /must include at least one of Ids, CampaignIds, or AdGroupIds/,
  );

  await assert.rejects(
    () => service.add({ BidModifiers: [] }),
    /params\.BidModifiers must be a non-empty array/,
  );

  await assert.rejects(
    () => service.set({ BidModifiers: [{ MobileAdjustment: { Percent: 90 } }] }),
    /must include BidModifierId, CampaignId, or AdGroupId/,
  );

  await assert.rejects(
    () => service.delete({ SelectionCriteria: { Ids: [] } }),
    /params\.SelectionCriteria\.Ids must include at least one id/,
  );
});
