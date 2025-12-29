import { Controller } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DailyReportService } from 'src/service/dailyReport.service';
import { HackerNewsService } from 'src/service/hackerNews.service';
import { RssService } from 'src/service/rss/rss.service';
import { SearchService } from 'src/service/search.service';

@Controller('cron')
export class CronController {
  constructor(
    private readonly dailyReportService: DailyReportService,
    private readonly searchService: SearchService,
    private readonly rssService: RssService,
    private readonly hackerNewsService: HackerNewsService,
  ) {}
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async dayCron() {
    if (process.env.NODE_ENV === 'location') return;
    await this.dailyReportService.sendToFs('company');
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async esClear() {
    if (process.env.NODE_ENV === 'location') return;
    await this.searchService.esClearLast();
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async rssCrawl() {
    if (process.env.NODE_ENV === 'location') return;
    await this.rssService.parseOpml();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async getNewStories() {
    if (process.env.NODE_ENV === 'location') return;
    const ids = await this.hackerNewsService.getNewStories2();
    await this.hackerNewsService.transRecords(ids);
    await this.hackerNewsService.cateRecords(ids);
  }
}
