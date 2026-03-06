import {
  DictionariesService,
  type DictionaryName,
  YandexDirectTransport,
} from "../src/index.js";

async function main() {
  const token = process.env.YANDEX_DIRECT_TOKEN;
  if (!token) {
    throw new Error("YANDEX_DIRECT_TOKEN is required");
  }

  const cache = new Map<DictionaryName, unknown[]>();
  const dictionaries = new DictionariesService(
    new YandexDirectTransport({
      token,
      language: "en",
      clientLogin: process.env.YANDEX_DIRECT_CLIENT_LOGIN,
    }),
    {
      cacheStrategy: {
        async get(dictionaryName) {
          return cache.get(dictionaryName);
        },
        async set(dictionaryName, entries) {
          cache.set(dictionaryName, entries);
        },
      },
    },
  );

  const response = await dictionaries.get(
    {
      DictionaryNames: ["Constants", "TimeZones"],
    },
    { useCache: true },
  );

  console.log("requestId:", response.metadata.requestId);
  console.log("constants:", response.data.result.Constants.length);
  console.log("timeZones:", response.data.result.TimeZones.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
