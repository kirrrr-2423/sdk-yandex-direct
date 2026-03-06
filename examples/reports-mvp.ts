import {
  ReportsService,
  YandexDirectTransport,
  isReportPending,
} from "../src/index.js";

async function main() {
  const token = process.env.YANDEX_DIRECT_TOKEN;
  if (!token) {
    throw new Error("YANDEX_DIRECT_TOKEN is required");
  }

  const reports = new ReportsService(new YandexDirectTransport({
    token,
    language: "en",
    clientLogin: process.env.YANDEX_DIRECT_CLIENT_LOGIN,
    useOperatorUnits: true,
  }));

  const response = await reports.create(
    {
      SelectionCriteria: {},
      FieldNames: ["Date", "Clicks"],
      ReportName: "Daily clicks",
      ReportType: "ACCOUNT_PERFORMANCE_REPORT",
      DateRangeType: "TODAY",
      Format: "TSV",
      IncludeVAT: "NO",
    },
    {
      reportHeaders: {
        processingMode: "auto",
        acceptEncoding: "gzip",
        skipReportHeader: true,
        skipColumnHeader: true,
        skipReportSummary: true,
      },
    },
  );

  if (isReportPending(response)) {
    console.log("Report is pending");
    console.log("retryInSeconds:", response.retryInSeconds);
    console.log("reportsInQueue:", response.reportsInQueue);
    return;
  }

  console.log("Report downloaded");
  console.log(response.report);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
