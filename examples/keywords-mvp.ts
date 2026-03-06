import { KeywordsService, YandexDirectTransport } from "../src/index.js";

async function main() {
  const token = process.env.YANDEX_DIRECT_TOKEN;
  if (!token) {
    throw new Error("YANDEX_DIRECT_TOKEN is required");
  }

  const keywords = new KeywordsService(new YandexDirectTransport({
    token,
    language: "en",
    clientLogin: process.env.YANDEX_DIRECT_CLIENT_LOGIN,
    useOperatorUnits: true,
  }));

  const list = await keywords.get({
    SelectionCriteria: {
      AdGroupIds: [123456],
    },
    FieldNames: [
      "Id",
      "Keyword",
      "AdGroupId",
      "State",
      "Bid",
      "ContextBid",
      "MinSearchPrice",
      "CurrentSearchPrice",
    ],
    Page: { Limit: 50, Offset: 0 },
  });

  const ids = list.data.result.Keywords
    .map((keyword) => keyword.Id)
    .filter((id): id is number => typeof id === "number");

  if (ids.length > 0) {
    await keywords.suspend({
      SelectionCriteria: { Ids: ids },
    });
    await keywords.resume({
      SelectionCriteria: { Ids: ids },
    });
  }

  console.log("requestId:", list.metadata.requestId);
  console.log("keywords:", list.data.result.Keywords.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
