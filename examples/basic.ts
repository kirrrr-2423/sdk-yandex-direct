import { YandexDirectClient } from "../src/index.js";

async function main() {
  const token = process.env.YANDEX_DIRECT_TOKEN;
  if (!token) {
    throw new Error("YANDEX_DIRECT_TOKEN is required");
  }

  const client = new YandexDirectClient({
    token,
    language: "en",
    clientLogin: process.env.YANDEX_DIRECT_CLIENT_LOGIN,
    useOperatorUnits: true,
  });

  const response = await client.campaigns.get({
    SelectionCriteria: {},
    FieldNames: ["Id", "Name"],
  });

  console.log("requestId:", response.metadata.requestId);
  console.log("units:", response.metadata.units);
  console.log("campaigns:", response.data.result.Campaigns);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
