import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { PromptsService } from 'src/service/ai/prompts.service';
import { FeishuRobotService } from 'src/service/feishu/feishuRobot.service';
import { DailyReportService } from 'src/service/dailyReport.service';
import AiTools from 'src/service/ai/AiTools';
import { ConfigService } from '@nestjs/config';
import { PROMPTS } from 'src/service/feishu/enum';

@Injectable()
export class AiCommand {
  constructor(
    private readonly promptsService: PromptsService,
    private readonly feishu: FeishuRobotService,
    private readonly dailyReportService: DailyReportService,
    private readonly configService: ConfigService,
  ) {}
  @Command({
    command: 'ai:prompts-cn',
  })
  async syncPromptCn() {
    await this.promptsService.syncPromptCn();
  }

  @Command({
    command: 'gpt',
  })
  async gpt() {
    const aiTools = new AiTools(this.configService);
    const messages = ['你是谁？'];
    const resp = await aiTools.simpleCompl(messages, PROMPTS.SSGF);
    console.log(resp);
  }

  @Command({
    command: 'fs',
  })
  async fsTest() {
    await this.feishu.set_app_access_token();
    // const resp = await this.feishu.sendToBean('holle');
    const resp = await this.feishu.getGroupMembers(
      this.feishu.company_receive_id,
    );
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
