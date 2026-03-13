import test from "node:test";
import assert from "node:assert/strict";

import {
  AdImagesService,
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

test("public client exposes adImages service", () => {
  const client = new YandexDirectClient({
    token: "token",
    fetch: async () => jsonResponse({ result: {} }),
  });

  assert.equal(typeof client.adImages.get, "function");
  assert.equal(typeof client.adImages.add, "function");
  assert.equal(typeof client.adImages.delete, "function");
});

test("AdImagesService maps get/add/delete methods", async () => {
  const methods = [];

  const service = new AdImagesService(new YandexDirectTransport({
    token: "token",
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init.body));
      methods.push(body.method);

      if (body.method === "get") {
        return jsonResponse({ result: { AdImages: [{ AdImageHash: "hash-1", Name: "Banner" }] } });
      }

      if (body.method === "add") {
        return jsonResponse({ result: { AddResults: [{ AdImageHash: "hash-1" }] } });
      }

      if (body.method === "delete") {
        return jsonResponse({ result: { DeleteResults: [{ AdImageHash: "hash-1" }] } });
      }

      throw new Error(`Unexpected method: ${body.method}`);
    },
  }));

  const getResult = await service.get({
    SelectionCriteria: { AdImageHashes: ["hash-1"] },
    FieldNames: ["AdImageHash", "Name"],
  });
  const addResult = await service.add({
    AdImages: [{ ImageData: "base64", Name: "Banner" }],
  });
  const deleteResult = await service.delete({
    SelectionCriteria: { AdImageHashes: ["hash-1"] },
  });

  assert.deepEqual(methods, ["get", "add", "delete"]);
  assert.equal(getResult.data.result.AdImages[0].AdImageHash, "hash-1");
  assert.equal(addResult.data.result.AddResults[0].AdImageHash, "hash-1");
  assert.equal(deleteResult.data.result.DeleteResults[0].AdImageHash, "hash-1");
});

test("AdImagesService validates required params", async () => {
  const service = new AdImagesService(new YandexDirectTransport({
    token: "token",
    fetch: async () => jsonResponse({ result: {} }),
  }));

  await assert.rejects(
    () => service.get({ FieldNames: [] }),
    /params\.FieldNames must be a non-empty array of strings/,
  );

  await assert.rejects(
    () => service.add({ AdImages: [] }),
    /params\.AdImages must be a non-empty array/,
  );

  await assert.rejects(
    () => service.delete({ SelectionCriteria: { AdImageHashes: [] } }),
    /params\.SelectionCriteria\.AdImageHashes must be a non-empty array of strings/,
  );
});
