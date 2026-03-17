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
import { Command, CommandRunner, Option } from 'nest-commander';

import { BiliService } from 'src/service/bili/bili.service';
import { exit } from 'process';

@Command({
  name: 'ai',
  description:
    'AI 相关命令入口。使用 `npm run cli -- ai --help` 查看帮助，使用 `npm run cli -- ai -c <command>` 执行具体子命令。',
})
export class AiCommand extends CommandRunner {
  feishu: FeishuRobot;
  constructor(
    private readonly promptsService: PromptsService,
    private readonly dailyReportService: DailyReportService,
    private readonly configService: ConfigService,
    private readonly hackerNewsService: HackerNewsService,
    private readonly searchService: SearchService,
    private readonly biliService: BiliService,
  ) {
    super();
    this.feishu = new FeishuRobot(this.configService);
  }

  async run(passedParam: string[], options?: any): Promise<void> {
    if (!options?.command) {
      this.printRuntimeGuide();
      return;
    }

    switch (options.command) {
      case 'syncPromptCn':
        await this.syncPromptCn();
        break;
      case 'gpt':
        await this.gpt();
        break;
      case 'gemini':
        await this.gemini();
        break;
      case 'info':
        await this.info();
        break;
      case 'getTopStories':
        await this.getTopStories();
        break;
      case 'transRecords':
        await this.transRecords();
        break;
      case 'cateRecords':
        await this.cateRecords();
        break;
      case 'syncEs':
        await this.syncEs();
        break;
      case 'fetchBilibiliHome':
        await this.fetchBilibiliHome();
        break;
      case 'BilibiliUserCrawler':
        await this.BilibiliUserCrawler();
        break;
      case 'dailyMd':
        await this.dailyMd();
        break;
      case 'upsTitles':
        await this.upsTitles();
        break;
      case 'anaUps':
        await this.anaUps(options);
        break;
      case 'getUpsContents':
        await this.getUpsContents();
        break;
      case 'genFollowings':
        await this.genFollowings();
        break;
      case 'biliLogin':
        await this.biliLogin();
        break;
      case 'videoPage':
        await this.videoPage();
        break;
      case 'upVideoPages':
        await this.upVideoPages();
        break;
      default:
        console.log(`未找到子命令: ${options.command}`);
        this.printRuntimeGuide();
        break;
    }
  }

  @Option({
    flags: '-c, --command [command]',
    description:
      '要执行的子命令，例如 syncPromptCn、gpt、gemini、getTopStories、anaUps',
  })
  getSubCommand(val: string): string {
    return val;
  }

  private printRuntimeGuide() {
    console.log('AiCommand 运行说明:');
    console.log('for linux npm run cli ai -- -c <command> [--mid <mid>]');
    console.log('for windows  npm run cli -- ai -- -c <command> [--mid <mid>]');
    console.log('');
    console.log('可用子命令:');

    for (const item of this.getCommandDescriptions()) {
      console.log(`  ${item.name.padEnd(20, ' ')}${item.description}`);
    }

    console.log('');
    console.log('示例:');
    console.log('  npm run cli ai -- -c gpt');
    console.log('  npm run cli ai -- -c getTopStories');
    console.log('  npm run cli ai -- -c anaUps --mid 23947287');
  }

  private getCommandDescriptions() {
    return [
      { name: 'syncPromptCn', description: '同步中文提示词' },
      { name: 'gpt', description: '调用 OpenAI 测试翻译能力' },
      { name: 'gemini', description: '调用 Gemini 进行简单对话测试' },
      { name: 'info', description: '生成并发送日报到飞书' },
      { name: 'getTopStories', description: '抓取 Hacker News 热门内容' },
      { name: 'transRecords', description: '翻译 Hacker News 记录' },
      { name: 'cateRecords', description: '为 Hacker News 记录分类' },
      { name: 'syncEs', description: '将数据同步到 Elasticsearch' },
      { name: 'fetchBilibiliHome', description: '抓取 Bilibili 首页' },
      {
        name: 'BilibiliUserCrawler',
        description: '抓取指定 Bilibili 用户信息',
      },
      { name: 'dailyMd', description: '生成日报 Markdown 内容' },
      { name: 'upsTitles', description: '生成关注 UP 主标题列表' },
      { name: 'anaUps', description: '分析指定 UP 主，需配合 --mid 使用' },
      { name: 'getUpsContents', description: '拉取默认 UP 主内容' },
      { name: 'genFollowings', description: '生成当前关注列表' },
      { name: 'biliLogin', description: '执行 Bilibili 登录流程' },
      { name: 'videoPage', description: '抓取默认视频页面信息' },
      { name: 'upVideoPages', description: '抓取默认 UP 主视频列表页' },
    ];
  }

  async syncPromptCn() {
    await this.promptsService.syncPromptCn();
  }

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

  async info() {
    await this.dailyReportService.sendToFs('bean');
  }

  async gemini() {
    const messages = '你是谁？';
    const genAi = new GeminiAi(this.configService);
    await genAi.simpleCompl(messages);
  }

  async getTopStories() {
    await this.hackerNewsService.getNewStories2();
  }

  async transRecords() {
    await this.hackerNewsService.transRecords();
    exit(0);
  }

  async cateRecords() {
    await this.hackerNewsService.cateRecords();
    exit(0);
  }

  async syncEs() {
    await this.hackerNewsService.syncEs();
  }

  async fetchBilibiliHome() {
    const bilibiliCrawler = new BilibiliCrawler();
    await bilibiliCrawler.launchBrowser();
    await bilibiliCrawler.fetchBilibiliHome();
  }

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

  async dailyMd() {
    // const list = await this.searchService.dailyMd();
    // const content = list.data
    //   .map((i) => i.data)
    //   .flat()
    //   .map((i) => {
    //     return {
    //       title: i.title,
    //       url: i.url,
    //     };
    //   });
    // // const csv = jsonToCsvString(content);
    // saveJsonFileToCsv(`output/daily/${list.title}.csv`, content);
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

  async upsTitles() {
    await this.biliService.genUpsTitles();
    exit(0);
  }

  async anaUps(options) {
    const mid = options.mid;
    await this.biliService.analyzeUp(mid);
    exit(0);
  }

  async getUpsContents() {
    const mid = 23947287;
    await this.biliService.getUpsContents(mid);
    exit(0);
  }

  async genFollowings() {
    await this.biliService.genFollowings();
    exit(0);
  }

  async biliLogin() {
    await this.biliService.login();
  }

  async videoPage() {
    const bvid = 'BV1L11vBBEsW';
    await this.biliService.videoPage(bvid);
  }

  async upVideoPages() {
    const mid = 23947287;
    await this.biliService.upVideoPages(mid);
  }
}
