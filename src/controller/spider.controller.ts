import { Controller } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { execSync } from 'child_process';
import { SearchService } from 'src/service/search.service';

@Controller('spider')
export class SpiderController {
  constructor(private readonly searchService: SearchService) {}
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async dayCron() {
    await this.searchService.crawlLastDay();
    await this.searchService.esClearLast();
  }

  @Cron(CronExpression.EVERY_WEEK)
  async weekCron() {
    process.chdir('scrapy');
    const spiderNames = ['elastic_cn'];

    let python = 'python';
    if (process.env.NODE_ENV === 'local') {
      python = 'python3';
    }

    for (const name of spiderNames) {
      const cmd = `${python} -m scrapy crawl ${name}`;
      try {
        await execSync(cmd, { encoding: 'utf-8' });
      } catch (error) {
        console.error(error);
      }
    }
  }
}
