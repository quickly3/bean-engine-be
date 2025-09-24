import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { PromptsService } from 'src/service/ai/prompts.service';
import { FeishuRobot } from 'src/service/feishu/feishuRobot';
import { DailyReportService } from 'src/service/dailyReport.service';
import OpenAi from 'src/service/ai/OpenAi';
import { ConfigService } from '@nestjs/config';
import { PROMPTS } from 'src/service/feishu/enum';
import GeminiAi from 'src/service/ai/Gemini';
import { HackerNewsService } from 'src/service/hackerNews.service';
import BilibiliCrawler from 'src/service/spider/crawlers/bilibili.crawler';
import BilibiliUserCrawler from 'src/service/spider/crawlers/bilibiliUser.crawler';

@Injectable()
export class AiCommand {
  feishu: FeishuRobot;
  constructor(
    private readonly promptsService: PromptsService,
    private readonly dailyReportService: DailyReportService,
    private readonly configService: ConfigService,
    private readonly hackerNewsService: HackerNewsService,
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

    const titles = [
      'Atomic nucleus excited with laser: A breakthrough after decades',
      'Common DB schema change mistakes in Postgres',
    ];

    const titles_string = JSON.stringify(titles);

    aiTools.setPrompts([PROMPTS.TRANSLATE]);
    const resp = await aiTools.simpleComplSimple(titles_string);
    console.log(resp.content);
  }

  @Command({
    command: 'info',
  })
  async info() {
    // const resp = await this.feishu.sendToBean('holle');
    await this.dailyReportService.sendToFs('bean');
  }

  @Command({
    command: 'gemini',
  })
  async gemini() {
    const messages = '你是谁？';
    const genAi = new GeminiAi(this.configService);
    await genAi.simpleCompl(messages);
  }

  @Command({
    command: 'getTopStories',
  })
  async getTopStories() {
    await this.hackerNewsService.getNewStoriesParsed();
  }

  @Command({
    command: 'sync es',
  })
  async syncEs() {
    await this.hackerNewsService.syncEs();
  }

  @Command({
    command: 'fetchBilibiliHome',
  })
  async fetchBilibiliHome() {
    const bilibiliCrawler = new BilibiliCrawler();
    await bilibiliCrawler.launchBrowser();
    await bilibiliCrawler.fetchBilibiliHome();
  }

  @Command({
    command: 'BilibiliUserCrawler',
  })
  async BilibiliUserCrawler() {
    const bilibiliUserCrawler = new BilibiliUserCrawler();
    await bilibiliUserCrawler.launchBrowser();
    await bilibiliUserCrawler.fetchBilibiliUser(3546911659264635);
  }
}
