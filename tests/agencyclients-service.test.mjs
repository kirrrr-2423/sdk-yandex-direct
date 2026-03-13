import test from "node:test";
import assert from "node:assert/strict";

import {
  AgencyClientsService,
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

test("public client exposes agencyClients service", () => {
  const client = new YandexDirectClient({
    token: "token",
    fetch: async () => jsonResponse({ result: {} }),
  });

  assert.equal(typeof client.agencyClients.get, "function");
  assert.equal(typeof client.agencyClients.add, "function");
  assert.equal(typeof client.agencyClients.update, "function");
});

test("AgencyClientsService maps get/add/update methods", async () => {
  const methods = [];
  const service = new AgencyClientsService(new YandexDirectTransport({
    token: "token",
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init.body));
      methods.push(body.method);

      if (body.method === "get") {
        return jsonResponse({ result: { Clients: [{ ClientId: 1, Login: "client-login" }] } });
      }

      if (body.method === "add") {
        return jsonResponse({ result: { AddResults: [{ Id: 1 }] } });
      }

      if (body.method === "update") {
        return jsonResponse({ result: { UpdateResults: [{ Id: 1 }] } });
      }

      throw new Error(`Unexpected method: ${body.method}`);
    },
  }));

  const getResult = await service.get({ FieldNames: ["ClientId", "Login"] });
  const addResult = await service.add({
    Clients: [{
      Login: "new-client",
      ClientInfo: "New client",
      Representative: {
        Login: "rep-login",
        FirstName: "Rep",
      },
    }],
  });
  const updateResult = await service.update({
    Clients: [{
      ClientId: 1,
      ClientInfo: "Updated client",
    }],
  });

  assert.deepEqual(methods, ["get", "add", "update"]);
  assert.equal(getResult.data.result.Clients[0].Login, "client-login");
  assert.equal(addResult.data.result.AddResults[0].Id, 1);
  assert.equal(updateResult.data.result.UpdateResults[0].Id, 1);
});

test("AgencyClientsService validates required params", async () => {
  const service = new AgencyClientsService(new YandexDirectTransport({
    token: "token",
    fetch: async () => jsonResponse({ result: {} }),
  }));

  await assert.rejects(
    () => service.get({ FieldNames: [] }),
    /params\.FieldNames must be a non-empty array of strings/,
  );

  await assert.rejects(
    () => service.add({ Clients: [] }),
    /params\.Clients must be a non-empty array/,
  );

  await assert.rejects(
    () => service.update({ Clients: [{ ClientId: 1 }] }),
    /at least one field to update besides ClientId/,
  );
});
