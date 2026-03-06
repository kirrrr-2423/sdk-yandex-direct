import test from "node:test";
import assert from "node:assert/strict";

import {
  AdsService,
  TransportError,
  UnsupportedAdFormatError,
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

test("AdsService serializes MVP method envelopes to /ads and returns typed results", async () => {
  const captured = [];

  const transport = new YandexDirectTransport({
    token: "test-token",
    fetch: async (url, init) => {
      const body = JSON.parse(init.body);
      captured.push({ url, body });

      if (body.method === "get") {
        return jsonResponse({
          result: {
            Ads: [
              {
                Id: 1,
                Type: "TEXT_AD",
                TextAd: { Title: "Hello", Text: "World" },
              },
            ],
            LimitedBy: 1000,
          },
        });
      }
      if (body.method === "add") {
        return jsonResponse({ result: { AddResults: [{ Id: 10 }] } });
      }
      if (body.method === "update") {
        return jsonResponse({ result: { UpdateResults: [{ Id: 10 }] } });
      }
      if (body.method === "suspend") {
        return jsonResponse({ result: { SuspendResults: [{ Id: 10 }] } });
      }
      if (body.method === "resume") {
        return jsonResponse({ result: { ResumeResults: [{ Id: 10 }] } });
      }

      throw new Error(`Unexpected method: ${body.method}`);
    },
  });

  const ads = new AdsService(transport);

  const getResponse = await ads.get({
    SelectionCriteria: { Ids: [1] },
    FieldNames: ["Id", "Type"],
    TextAdFieldNames: ["Title", "Text"],
  });
  await ads.add({
    Ads: [
      {
        AdGroupId: 101,
        TextAd: {
          Title: "New ad",
          Text: "Body",
          Href: "https://example.com",
        },
      },
    ],
  });
  await ads.update({
    Ads: [
      {
        Id: 10,
        MobileAppAd: {
          Title: "Updated app ad",
          Text: "Install now",
        },
      },
    ],
  });
  await ads.suspend({ SelectionCriteria: { Ids: [10] } });
  await ads.resume({ SelectionCriteria: { Ids: [10] } });

  assert.equal(captured.length, 5);
  for (const request of captured) {
    assert.equal(request.url, "https://api.direct.yandex.com/json/v5/ads");
  }
  assert.deepEqual(
    captured.map((request) => request.body.method),
    ["get", "add", "update", "suspend", "resume"],
  );
  assert.equal(getResponse.data.result.Ads[0].Type, "TEXT_AD");
  assert.equal(getResponse.data.result.Ads[0].TextAd.Title, "Hello");
});

test("AdsService rejects unsupported add payload format before transport call", async () => {
  let fetchCalls = 0;
  const transport = new YandexDirectTransport({
    token: "test-token",
    fetch: async () => {
      fetchCalls += 1;
      return jsonResponse({ result: { AddResults: [{ Id: 1 }] } });
    },
  });
  const ads = new AdsService(transport);

  await assert.rejects(
    () => ads.add({
      Ads: [
        {
          AdGroupId: 5,
          DynamicTextAd: { DomainUrl: "https://example.com" },
        },
      ],
    }),
    (error) => {
      assert.ok(error instanceof UnsupportedAdFormatError);
      assert.equal(error.code, "UNSUPPORTED_AD_FORMAT");
      assert.equal(error.reason, "unsupported");
      return true;
    },
  );

  assert.equal(fetchCalls, 0);
});

test("AdsService rejects unsupported ad format in get result envelope", async () => {
  const transport = new YandexDirectTransport({
    token: "test-token",
    fetch: async () => jsonResponse({
      result: {
        Ads: [
          {
            Id: 1,
            Type: "DYNAMIC_TEXT_AD",
            DynamicTextAd: {
              DomainUrl: "https://example.com",
            },
          },
        ],
      },
    }),
  });
  const ads = new AdsService(transport);

  await assert.rejects(
    () => ads.get({
      SelectionCriteria: { Ids: [1] },
      FieldNames: ["Id", "Type"],
    }),
    (error) => {
      assert.ok(error instanceof UnsupportedAdFormatError);
      assert.equal(error.reason, "unsupported");
      return true;
    },
  );
});

test("AdsService enforces result envelope shape for state transitions", async () => {
  const transport = new YandexDirectTransport({
    token: "test-token",
    fetch: async () => jsonResponse({
      result: {
        ResumeItems: [],
      },
    }),
  });
  const ads = new AdsService(transport);

  await assert.rejects(
    () => ads.resume({ SelectionCriteria: { Ids: [1] } }),
    (error) => {
      assert.ok(error instanceof TransportError);
      assert.match(error.message, /ResumeResults/);
      return true;
    },
  );
});
