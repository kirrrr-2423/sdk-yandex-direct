import test from "node:test";
import assert from "node:assert/strict";

import {
  SitelinksService,
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

test("public client exposes sitelinks service", () => {
  const client = new YandexDirectClient({
    token: "token",
    fetch: async () => jsonResponse({ result: {} }),
  });

  assert.equal(typeof client.sitelinks.get, "function");
  assert.equal(typeof client.sitelinks.add, "function");
  assert.equal(typeof client.sitelinks.delete, "function");
});

test("SitelinksService maps get/add/delete methods", async () => {
  const methods = [];
  const service = new SitelinksService(new YandexDirectTransport({
    token: "token",
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init.body));
      methods.push(body.method);

      if (body.method === "get") {
        return jsonResponse({ result: { SitelinksSets: [{ Id: 1, Sitelinks: [{ Title: "Catalog" }] }] } });
      }

      if (body.method === "add") {
        return jsonResponse({ result: { AddResults: [{ Id: 1 }] } });
      }

      if (body.method === "delete") {
        return jsonResponse({ result: { DeleteResults: [{ Id: 1 }] } });
      }

      throw new Error(`Unexpected method: ${body.method}`);
    },
  }));

  const getResult = await service.get({ FieldNames: ["Id", "Sitelinks"] });
  const addResult = await service.add({
    SitelinksSets: [{ Sitelinks: [{ Title: "Catalog", Href: "https://example.com" }] }],
  });
  const deleteResult = await service.delete({ SelectionCriteria: { Ids: [1] } });

  assert.deepEqual(methods, ["get", "add", "delete"]);
  assert.equal(getResult.data.result.SitelinksSets[0].Id, 1);
  assert.equal(addResult.data.result.AddResults[0].Id, 1);
  assert.equal(deleteResult.data.result.DeleteResults[0].Id, 1);
});

test("SitelinksService validates required params", async () => {
  const service = new SitelinksService(new YandexDirectTransport({
    token: "token",
    fetch: async () => jsonResponse({ result: {} }),
  }));

  await assert.rejects(
    () => service.get({ FieldNames: [] }),
    /params\.FieldNames must be a non-empty array of strings/,
  );

  await assert.rejects(
    () => service.add({ SitelinksSets: [] }),
    /params\.SitelinksSets must be a non-empty array/,
  );

  await assert.rejects(
    () => service.delete({ SelectionCriteria: { Ids: [] } }),
    /params\.SelectionCriteria\.Ids must include at least one id/,
  );
});
