import { Command, CommandRunner, Option } from 'nest-commander';
import { SpiderService } from 'src/service/spider/spider.service';
import { RssService } from 'src/service/rss/rss.service';

@Command({
  name: 'spider',
  description:
    '爬虫相关命令入口。使用 `npm run cli -- spider --help` 查看帮助，使用 `npm run cli -- spider -c <command>` 执行具体子命令。',
})
export class SpiderCommand extends CommandRunner {
  constructor(
    private readonly spiderService: SpiderService,
    private readonly rssService: RssService,
  ) {
    super();
  }

  async run(_passedParam: string[], options?: any): Promise<void> {
    void _passedParam;

    if (!options?.command) {
      this.printRuntimeGuide();
      return;
    }

    switch (options.command) {
      case 'crwal:36kr':
        await this.crwal_36kr();
        break;
      case 'crwal:36kr_detail':
        await this.detail_36kr();
        break;
      case 'crwal:36kr_batch':
        await this.crawlBatch36kr();
        break;
      case 'crwal:today_report':
        await this.genTodayReport();
        break;
      case 'week_report':
        await this.genWeekReport();
        break;
      case 'crwal:parseByAi':
        await this.parseByAi();
        break;
      case 'crwal:oc_list_oc':
        await this.list_oc();
        break;
      case 'crawl:csdn':
        await this.crawlCsdn();
        break;
      case 'rss:resource':
        await this.getRssResource();
        break;
      case 'crawl:guan':
        await this.crawlGuan();
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
      '要执行的子命令，例如 crwal:36kr、crwal:36kr_batch、crawl:csdn、rss:resource',
  })
  getSubCommand(val: string): string {
    return val;
  }

  private printRuntimeGuide() {
    console.log('SpiderCommand 运行说明:');
    console.log('for linux npm run cli spider -- -c <command>');
    console.log('for windows  npm run cli -- spider -- -c <command>');
    console.log('');
    console.log('可用子命令:');

    for (const item of this.getCommandDescriptions()) {
      console.log(`  ${item.name.padEnd(20, ' ')}${item.description}`);
    }

    console.log('');
    console.log('示例:');
    console.log('  npm run cli -- spider -- -c crwal:36kr');
    console.log('  npm run cli -- spider -- -c crwal:36kr_batch');
    console.log('  npm run cli -- spider -- -c crawl:csdn');
  }

  private getCommandDescriptions() {
    return [
      { name: 'crwal:36kr', description: '抓取 36kr 列表并导出 CSV' },
      { name: 'crwal:36kr_detail', description: '抓取默认 36kr 文章详情' },
      { name: 'crwal:36kr_batch', description: '批量抓取 36kr 内容' },
      { name: 'crwal:today_report', description: '生成今日报告' },
      { name: 'week_report', description: '生成周报' },
      { name: 'crwal:parseByAi', description: '调用 AI 解析示例内容' },
      { name: 'crwal:oc_list_oc', description: '抓取开源中国项目列表' },
      { name: 'crawl:csdn', description: '抓取 CSDN 内容' },
      { name: 'rss:resource', description: '解析 RSS 资源（OPML）' },
      { name: 'crawl:guan', description: '抓取观察者网用户文章' },
    ];
  }

  async crwal_36kr() {
    await this.spiderService.crwal_36kr({ exportToCsv: true });
  }

  async detail_36kr() {
    const url = 'https://36kr.com/p/3232928560070281';
    const resp = await this.spiderService.detail_36kr(url);
    console.log(resp);
  }

  async crawlBatch36kr() {
    const resp = await this.spiderService.crawlBatch36kr();
    console.log(resp);
  }

  async genTodayReport() {
    const resp = await this.spiderService.genTodayReport();
    console.log(resp);
  }

  async genWeekReport() {
    const resp = await this.spiderService.genWeekReport();
    console.log(resp);
  }

  async parseByAi() {
    const content = '黄鹤楼是什么？回答100字以内';
    const resp = await this.spiderService.parseByAi(content);
    console.log(resp);
  }

  async list_oc() {
    const url = 'https://www.oschina.net/project/lang/467/kotlin';
    await this.spiderService.list_oc(url);
  }

  async crawlCsdn() {
    const resp = await this.spiderService.crawlCsdn();
    console.log('CSDN抓取完成:', resp);
  }

  async getRssResource() {
    await this.rssService.parseOpml();
  }

  async crawlGuan() {
    await this.spiderService.crawGuanUserArticles();
  }
}
