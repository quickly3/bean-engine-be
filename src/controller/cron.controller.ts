import { Controller, Get, Query } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DailyReportService } from 'src/service/dailyReport.service';
import { HackerNewsService } from 'src/service/hackerNews.service';
import { RssService } from 'src/service/rss/rss.service';
import { SearchService } from 'src/service/search.service';

@ApiTags('cron')
@Controller('cron')
export class CronController {
  constructor(
    private readonly dailyReportService: DailyReportService,
    private readonly searchService: SearchService,
    private readonly rssService: RssService,
    private readonly hackerNewsService: HackerNewsService,
  ) {}
  @Get('hacknews/ai-daily-report')
  @ApiOperation({ summary: '查询当天 HackerNews AI 新闻并生成日报' })
  @ApiQuery({
    name: 'date',
    required: false,
    description: '日期，格式 YYYY-MM-DD，默认今天',
  })
  async getAiDailyReport(@Query('date') date?: string) {
    return this.hackerNewsService.generateAiDailyReport(date);
  }

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
