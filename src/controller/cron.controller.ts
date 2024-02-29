import { Controller } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DailyReportService } from 'src/service/dailyReport.service';

@Controller('cron')
export class CronController {
  constructor(private readonly dailyReportService: DailyReportService) {}
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async dayCron() {
    await this.dailyReportService.sendToFs('company');
  }
}
