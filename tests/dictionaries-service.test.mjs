import test from "node:test";
import assert from "node:assert/strict";

import {
  DictionariesService,
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

test("public client exposes dictionaries service", () => {
  const client = new YandexDirectClient({
    token: "token",
    fetch: async () => jsonResponse({ result: {} }),
  });

  assert.equal(typeof client.dictionaries.get, "function");
  assert.equal(typeof client.dictionaries.getGeoRegions, "function");
});

test("DictionariesService maps get and getGeoRegions methods", async () => {
  const methods = [];

  const service = new DictionariesService(new YandexDirectTransport({
    token: "token",
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init.body));
      methods.push(body.method);

      if (body.method === "get") {
        return jsonResponse({ result: { TimeZones: [{ TimeZone: "Europe/Moscow" }] } });
      }

      if (body.method === "getGeoRegions") {
        return jsonResponse({ result: { GeoRegions: [{ GeoRegionId: 213, GeoRegionName: "Moscow" }] } });
      }

      throw new Error(`Unexpected method: ${body.method}`);
    },
  }));

  const getResult = await service.get({ DictionaryNames: ["TimeZones"] });
  const geoResult = await service.getGeoRegions({
    SelectionCriteria: { Name: "Moscow" },
    FieldNames: ["GeoRegionId", "GeoRegionName"],
  });

  assert.deepEqual(methods, ["get", "getGeoRegions"]);
  assert.equal(getResult.data.result.TimeZones[0].TimeZone, "Europe/Moscow");
  assert.equal(geoResult.data.result.GeoRegions[0].GeoRegionId, 213);
});

test("DictionariesService validates required params", async () => {
  const service = new DictionariesService(new YandexDirectTransport({
    token: "token",
    fetch: async () => jsonResponse({ result: {} }),
  }));

  await assert.rejects(
    () => service.get({ DictionaryNames: [] }),
    /params\.DictionaryNames must be a non-empty array of strings/,
  );

  await assert.rejects(
    () => service.getGeoRegions({
      SelectionCriteria: {},
      FieldNames: ["GeoRegionId"],
    }),
    /must include at least one of Name, RegionIds, or ExactNames/,
  );
});
