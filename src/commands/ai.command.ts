import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { PromptsService } from 'src/service/ai/prompts.service';
import { FeishuRobotService } from 'src/service/feishu/feishuRobot.service';
import { DailyReportService } from 'src/service/dailyReport.service';

@Injectable()
export class AiCommand {
  constructor(
    private readonly promptsService: PromptsService,
    private readonly feishu: FeishuRobotService,
    private readonly dailyReportService: DailyReportService,
  ) {}
  @Command({
    command: 'ai:prompts-cn',
  })
  async syncPromptCn() {
    await this.promptsService.syncPromptCn();
  }

  @Command({
    command: 'fs',
  })
  async fsTest() {
    await this.feishu.set_app_access_token();
    // const resp = await this.feishu.sendToBean('holle');
    const resp = await this.feishu.getChatgroupList();
    console.log(resp);
  }

  @Command({
    command: 'info',
  })
  async info() {
    // const resp = await this.feishu.sendToBean('holle');
    await this.dailyReportService.sendToFs('company');
  }
}
