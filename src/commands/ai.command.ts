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
import { SearchService } from 'src/service/search.service';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { ChatDeepSeek } from 'node_modules/@langchain/deepseek/dist';
import { jsonToCsvString, saveJsonFileToCsv, saveMd } from 'src/utils/file';

@Injectable()
export class AiCommand {
  feishu: FeishuRobot;
  constructor(
    private readonly promptsService: PromptsService,
    private readonly dailyReportService: DailyReportService,
    private readonly configService: ConfigService,
    private readonly hackerNewsService: HackerNewsService,
    private readonly searchService: SearchService,
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

  // 1.将这个文件里面的新闻去重，精简，按照内容分类，
  // 2.返回markdown的raw格式
  // 3.每个分类下来使用有序列表，并使用[title](url)的格式展示
  // 4.markdown 内容以“## {当前文件名(不要后缀)}”为标题开头
  // 5.保存为同目录下{当前文件名}.md 文件

  @Command({
    command: 'dailyMd',
  })
  async dailyMd() {
    const list = await this.searchService.dailyMd();

    const content = list.data
      .map((i) => i.data)
      .flat()
      .map((i) => {
        return {
          title: i.title,
          url: i.url,
        };
      });

    // const csv = jsonToCsvString(content);
    saveJsonFileToCsv(`output/daily/${list.title}.csv`, content);

    // const model = new ChatDeepSeek({
    //   apiKey: this.configService.get('deepseek.DS_KEY'),
    //   model: 'deepseek-chat',
    // });

    // const prompt = `1.将上面的新闻去重，精简，按照内容分类，
    //    2.返回markdown的raw格式
    //    3.每个分类下来使用有序列表，并使用[title](url)的格式展示
    //    4.markdown 内容以“## ${list.title}”为标题开头`;

    // const messages = [new SystemMessage(prompt), new HumanMessage(csv)];

    // const resp = await model.invoke(messages);
    // console.log(resp.content);
    // saveMd(`output/daily/${list.title}.md`, resp.content);
    // return resp.content;
  }
}
