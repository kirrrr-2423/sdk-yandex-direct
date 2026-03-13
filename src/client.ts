import { AdsService } from "./ads/service.js";
import { AdGroupsService } from "./services/adgroups.js";
import { CampaignsService } from "./services/campaigns.js";
import { YandexDirectTransport } from "./transport.js";
import type { YandexDirectClientConfig } from "./types.js";

export class YandexDirectClient {
  readonly transport: YandexDirectTransport;
  readonly ads: AdsService;
  readonly adGroups: AdGroupsService;
  readonly campaigns: CampaignsService;

  constructor(configOrTransport: YandexDirectClientConfig | YandexDirectTransport) {
    this.transport = configOrTransport instanceof YandexDirectTransport
      ? configOrTransport
      : new YandexDirectTransport(configOrTransport);
    this.ads = new AdsService(this.transport);
    this.adGroups = new AdGroupsService(this.transport);
    this.campaigns = new CampaignsService(this.transport);
  }
}
