import { CampaignsService } from "./services/campaigns.js";
import { YandexDirectTransport } from "./transport.js";
import type { YandexDirectClientConfig } from "./types.js";

export class YandexDirectClient {
  readonly transport: YandexDirectTransport;
  readonly campaigns: CampaignsService;

  constructor(configOrTransport: YandexDirectClientConfig | YandexDirectTransport) {
    this.transport = configOrTransport instanceof YandexDirectTransport
      ? configOrTransport
      : new YandexDirectTransport(configOrTransport);
    this.campaigns = new CampaignsService(this.transport);
  }
}
