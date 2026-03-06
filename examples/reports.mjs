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

  const response = await transport.requestReport(
    {
      params: {
        SelectionCriteria: {},
        FieldNames: ["Date", "CampaignId", "Clicks", "Cost"],
        ReportName: "Clicks and cost example",
        ReportType: "CAMPAIGN_PERFORMANCE_REPORT",
        DateRangeType: "LAST_7_DAYS",
        Format: "TSV",
      },
    },
    {
      idempotent: true,
      reportHeaders: {
        processingMode: "auto",
        returnMoneyInMicros: true,
        skipReportHeader: true,
        skipColumnHeader: false,
        skipReportSummary: true,
      },
    },
  );

  console.log("requestId:", response.metadata.requestId);
  console.log("retryIn:", response.metadata.retryIn);
  console.log("reportsInQueue:", response.metadata.reportsInQueue);
  console.log("report:");
  console.log(response.data);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
