import { AdGroupsService, YandexDirectTransport } from "../dist/index.js";

async function main() {
  const token = process.env.YANDEX_DIRECT_TOKEN;
  if (!token) {
    throw new Error("YANDEX_DIRECT_TOKEN is required");
  }

  const adGroups = new AdGroupsService(new YandexDirectTransport({
    token,
    language: "en",
    clientLogin: process.env.YANDEX_DIRECT_CLIENT_LOGIN,
    useOperatorUnits: true,
  }));

  const list = await adGroups.get({
    SelectionCriteria: {
      CampaignIds: [123456],
    },
    FieldNames: ["Id", "Name", "CampaignId", "Status"],
    Page: { Limit: 50, Offset: 0 },
  });

  const ids = list.data.result.AdGroups
    .map((group) => group.Id)
    .filter((id) => typeof id === "number");

  if (ids.length > 0) {
    await adGroups.suspend({
      SelectionCriteria: { Ids: ids },
    });
    await adGroups.resume({
      SelectionCriteria: { Ids: ids },
    });
  }

  console.log("requestId:", list.metadata.requestId);
  console.log("adGroups:", list.data.result.AdGroups.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
