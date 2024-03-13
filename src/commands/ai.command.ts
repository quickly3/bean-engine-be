import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { PromptsService } from 'src/service/ai/prompts.service';
import { FeishuRobot } from 'src/service/feishu/feishuRobot';
import { DailyReportService } from 'src/service/dailyReport.service';
import OpenAi from 'src/service/ai/OpenAi';
import { ConfigService } from '@nestjs/config';
import { PROMPTS } from 'src/service/feishu/enum';
import GeminiAi from 'src/service/ai/Gemini';

@Injectable()
export class AiCommand {
  feishu: FeishuRobot;
  constructor(
    private readonly promptsService: PromptsService,
    private readonly dailyReportService: DailyReportService,
    private readonly configService: ConfigService,
  ) {
    this.feishu = new FeishuRobot(this.configService);
  }
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
    const aiTools = new OpenAi(this.configService);
    const messages = ['你是谁？'];
    aiTools.setPrompts([PROMPTS.SSGF]);
    const resp = await aiTools.simpleCompl(messages);
    console.log(resp);
  }

  @Command({
    command: 'info',
  })
  async info() {
    // const resp = await this.feishu.sendToBean('holle');
    await this.dailyReportService.sendToFs('company');
  }

  @Command({
    command: 'gemini',
  })
  async gemini() {
    const messages = '你是谁？';
    const genAi = new GeminiAi(this.configService);
    await genAi.simpleCompl(messages);
  }
}
