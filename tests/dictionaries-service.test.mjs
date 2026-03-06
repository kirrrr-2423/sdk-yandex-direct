import test from "node:test";
import assert from "node:assert/strict";

import {
  DictionariesService,
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

test("DictionariesService.get validates dictionary names", async () => {
  const service = new DictionariesService(new YandexDirectTransport({
    token: "token",
    fetch: async () => jsonResponse({ result: {} }),
  }));

  await assert.rejects(
    () => service.get({
      DictionaryNames: ["InvalidDictionary"],
    }),
    /unsupported value/,
  );
});

test("DictionariesService.get sends get envelope and parses typed dictionary values", async () => {
  const requestBodies = [];
  const transport = new YandexDirectTransport({
    token: "token",
    fetch: async (_url, init) => {
      requestBodies.push(JSON.parse(String(init.body)));
      return jsonResponse({
        result: {
          Constants: [{ Name: "MaxKeywords", Value: "200" }],
          TimeZones: [{ TimeZone: "Europe/Moscow", TimeZoneName: "Moscow", UtcOffset: 3 }],
        },
      });
    },
  });

  const service = new DictionariesService(transport);
  const response = await service.get({
    DictionaryNames: ["Constants", "TimeZones", "Constants"],
  });

  assert.equal(requestBodies.length, 1);
  assert.equal(requestBodies[0].method, "get");
  assert.deepEqual(requestBodies[0].params.DictionaryNames, ["Constants", "TimeZones"]);
  assert.deepEqual(response.data.result.Constants, [{ Name: "MaxKeywords", Value: "200" }]);
  assert.deepEqual(
    response.data.result.TimeZones,
    [{ TimeZone: "Europe/Moscow", TimeZoneName: "Moscow", UtcOffset: 3 }],
  );
});

test("DictionariesService.get rejects malformed dictionary payloads", async () => {
  const service = new DictionariesService(new YandexDirectTransport({
    token: "token",
    fetch: async () => jsonResponse({
      result: {
        MetroStations: [{ GeoRegionId: 213, MetroStationName: "Okhotny Ryad" }],
      },
    }),
  }));

  await assert.rejects(
    () => service.get({
      DictionaryNames: ["MetroStations"],
    }),
    /MetroStationId must be an integer/,
  );
});

test("DictionariesService.get supports opt-in cache strategy hooks", async () => {
  const cacheGetCalls = [];
  const cacheSetCalls = [];
  let transportCalls = 0;

  const cache = new Map();
  cache.set("Constants", [{ Name: "MaxKeywords", Value: "200" }]);

  const transport = new YandexDirectTransport({
    token: "token",
    fetch: async (_url, init) => {
      transportCalls += 1;
      const payload = JSON.parse(String(init.body));
      assert.deepEqual(payload.params.DictionaryNames, ["TimeZones"]);

      return jsonResponse({
        result: {
          TimeZones: [{ TimeZone: "Asia/Yekaterinburg", TimeZoneName: "UTC+5", UtcOffset: 5 }],
        },
      });
    },
  });

  const dictionaries = new DictionariesService(transport, {
    cacheStrategy: {
      async get(dictionaryName) {
        cacheGetCalls.push(dictionaryName);
        return cache.get(dictionaryName);
      },
      async set(dictionaryName, entries) {
        cacheSetCalls.push(dictionaryName);
        cache.set(dictionaryName, entries);
      },
    },
  });

  const mixedResponse = await dictionaries.get(
    { DictionaryNames: ["Constants", "TimeZones"] },
    { useCache: true },
  );

  assert.equal(transportCalls, 1);
  assert.deepEqual(cacheGetCalls, ["Constants", "TimeZones"]);
  assert.deepEqual(cacheSetCalls, ["TimeZones"]);
  assert.deepEqual(
    mixedResponse.data.result.TimeZones,
    [{ TimeZone: "Asia/Yekaterinburg", TimeZoneName: "UTC+5", UtcOffset: 5 }],
  );

  const cacheOnlyResponse = await dictionaries.get(
    { DictionaryNames: ["Constants"] },
    { useCache: true },
  );

  assert.equal(transportCalls, 1);
  assert.equal(cacheOnlyResponse.metadata.status, 200);
  assert.deepEqual(cacheOnlyResponse.data.result.Constants, [{ Name: "MaxKeywords", Value: "200" }]);
});
