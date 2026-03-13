import test from "node:test";
import assert from "node:assert/strict";

import {
  KeywordBidsService,
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

test("public client exposes keywordBids service", () => {
  const client = new YandexDirectClient({
    token: "token",
    fetch: async () => jsonResponse({ result: {} }),
  });

  assert.equal(typeof client.keywordBids.get, "function");
  assert.equal(typeof client.keywordBids.set, "function");
  assert.equal(typeof client.keywordBids.setAuto, "function");
});

test("KeywordBidsService maps get/set/setAuto methods", async () => {
  const methods = [];
  const service = new KeywordBidsService(new YandexDirectTransport({
    token: "token",
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init.body));
      methods.push(body.method);

      if (body.method === "get") {
        return jsonResponse({ result: { KeywordBids: [{ KeywordId: 1, SearchBid: 1000000 }] } });
      }

      if (body.method === "set") {
        return jsonResponse({ result: { SetResults: [{ KeywordId: 1 }] } });
      }

      if (body.method === "setAuto") {
        return jsonResponse({ result: { SetAutoResults: [{ KeywordId: 1 }] } });
      }

      throw new Error(`Unexpected method: ${body.method}`);
    },
  }));

  const getResult = await service.get({
    SelectionCriteria: { KeywordIds: [1] },
    FieldNames: ["KeywordId", "SearchBid"],
  });
  const setResult = await service.set({
    KeywordBids: [{ KeywordId: 1, SearchBid: 1000000 }],
  });
  const setAutoResult = await service.setAuto({
    KeywordBids: [{ AdGroupId: 10, Value: 1000000 }],
  });

  assert.deepEqual(methods, ["get", "set", "setAuto"]);
  assert.equal(getResult.data.result.KeywordBids[0].KeywordId, 1);
  assert.equal(setResult.data.result.SetResults[0].KeywordId, 1);
  assert.equal(setAutoResult.data.result.SetAutoResults[0].KeywordId, 1);
});

test("KeywordBidsService validates required params", async () => {
  const service = new KeywordBidsService(new YandexDirectTransport({
    token: "token",
    fetch: async () => jsonResponse({ result: {} }),
  }));

  await assert.rejects(
    () => service.get({ SelectionCriteria: {}, FieldNames: ["KeywordId"] }),
    /must include at least one of KeywordIds, AdGroupIds, or CampaignIds/,
  );

  await assert.rejects(
    () => service.set({ KeywordBids: [] }),
    /params\.KeywordBids must be a non-empty array/,
  );

  await assert.rejects(
    () => service.setAuto({ KeywordBids: [{ Value: 1000000 }] }),
    /must include AdGroupId or CampaignId/,
  );
});
