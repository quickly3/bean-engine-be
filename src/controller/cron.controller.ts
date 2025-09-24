import { Controller } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DailyReportService } from 'src/service/dailyReport.service';
import { RssService } from 'src/service/rss/rss.service';
import { SearchService } from 'src/service/search.service';

@Controller('cron')
export class CronController {
  constructor(
    private readonly dailyReportService: DailyReportService,
    private readonly searchService: SearchService,
    private readonly rssService: RssService,
  ) {}
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async dayCron() {
    await this.dailyReportService.sendToFs('company');
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async esClear() {
    await this.searchService.esClearLast();
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async rssCrawl() {
    await this.rssService.parseOpml();
  }
}
