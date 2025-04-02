import { Injectable } from '@nestjs/common';
import Kr36Crawler from './crawlers/kr36.crawler';
import { ConfigService } from '@nestjs/config';
import Kr36DetailCrawler from './crawlers/kr36Detail.crawler';

@Injectable()
export class SipderService {
  constructor(private readonly configService: ConfigService) {}
  async crwal_36kr() {
    const params = {
      configService: this.configService,
    };
    const crawler = new Kr36Crawler(params);
    await crawler.start();
  }

  async detail_36kr(url) {
    const params = {
      configService: this.configService,
    };
    const crawler = new Kr36DetailCrawler(params);

    await crawler.crawlArticle(url);
  }
}
