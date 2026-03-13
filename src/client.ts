import { AdsService } from "./ads/service.js";
import { AdGroupsService } from "./services/adgroups.js";
import { AdImagesService } from "./services/adimages.js";
import { AgencyClientsService } from "./services/agencyclients.js";
import { BidModifiersService } from "./services/bidmodifiers.js";
import { CampaignsService } from "./services/campaigns.js";
import { DictionariesService } from "./services/dictionaries.js";
import { KeywordBidsService } from "./services/keywordbids.js";
import { KeywordsService } from "./services/keywords.js";
import { SitelinksService } from "./services/sitelinks.js";
import { YandexDirectTransport } from "./transport.js";
import type { YandexDirectClientConfig } from "./types.js";

export class YandexDirectClient {
  readonly transport: YandexDirectTransport;
  readonly ads: AdsService;
  readonly adGroups: AdGroupsService;
  readonly adImages: AdImagesService;
  readonly agencyClients: AgencyClientsService;
  readonly bidModifiers: BidModifiersService;
  readonly campaigns: CampaignsService;
  readonly dictionaries: DictionariesService;
  readonly keywordBids: KeywordBidsService;
  readonly keywords: KeywordsService;
  readonly sitelinks: SitelinksService;

  constructor(configOrTransport: YandexDirectClientConfig | YandexDirectTransport) {
    this.transport = configOrTransport instanceof YandexDirectTransport
      ? configOrTransport
      : new YandexDirectTransport(configOrTransport);
    this.ads = new AdsService(this.transport);
    this.adGroups = new AdGroupsService(this.transport);
    this.adImages = new AdImagesService(this.transport);
    this.agencyClients = new AgencyClientsService(this.transport);
    this.bidModifiers = new BidModifiersService(this.transport);
    this.campaigns = new CampaignsService(this.transport);
    this.dictionaries = new DictionariesService(this.transport);
    this.keywordBids = new KeywordBidsService(this.transport);
    this.keywords = new KeywordsService(this.transport);
    this.sitelinks = new SitelinksService(this.transport);
  }
}
