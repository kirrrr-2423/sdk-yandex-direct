import { YandexDirectTransport } from "../dist/index.js";

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

  const response = await transport.requestService(
    "campaigns",
    {
      method: "get",
      params: {
        SelectionCriteria: {},
        FieldNames: ["Id", "Name"],
      },
    },
    {
      idempotent: true,
    },
  );

  console.log("requestId:", response.metadata.requestId);
  console.log("units:", response.metadata.units);
  console.log("payload:", response.data);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
