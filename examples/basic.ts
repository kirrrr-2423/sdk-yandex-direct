import { AdsService, YandexDirectTransport } from "../src/index.js";

async function main() {
  const token = process.env.YANDEX_DIRECT_TOKEN;
  if (!token) {
    throw new Error("YANDEX_DIRECT_TOKEN is required");
  }

  const transport = new YandexDirectTransport({
    token,
    language: "en",
    clientLogin: process.env.YANDEX_DIRECT_CLIENT_LOGIN,
    useOperatorUnits: true,
  });

  const ads = new AdsService(transport);

  const response = await ads.get({
    SelectionCriteria: { Ids: [123456789] },
    FieldNames: ["Id", "CampaignId", "AdGroupId", "Type", "Status", "State"],
    TextAdFieldNames: ["Title", "Text", "Href"],
  });

  console.log("requestId:", response.metadata.requestId);
  console.log("units:", response.metadata.units);
  console.log("ads:", response.data.result.Ads);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
