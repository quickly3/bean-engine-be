import { Command, CommandRunner, Option } from 'nest-commander';
import { HackerNewsService } from 'src/service/hackerNews.service';
import { exit } from 'process';

@Command({
  name: 'hacknews',
  description:
    'HackerNews 相关命令入口。使用 `npm run cli -- hacknews --help` 查看帮助，使用 `npm run cli -- hacknews -c <command>` 执行具体子命令。',
})
export class HacknewsCommand extends CommandRunner {
  constructor(private readonly hackerNewsService: HackerNewsService) {
    super();
  }

  async run(_passedParam: string[], options?: any): Promise<void> {
    void _passedParam;

    if (!options?.command) {
      this.printRuntimeGuide();
      return;
    }

    try {
      switch (options.command) {
        // npm run cli -- hacknews -- -c aiDailyReport [--date 2026-07-19]
        case 'aiDailyReport':
          await this.aiDailyReport(options.date);
          break;
        // npm run cli -- hacknews -- -c aiDailyReportMd [--date 2026-07-19]
        case 'aiDailyReportMd':
          await this.aiDailyReportMd(options.date);
          break;
        // npm run cli -- hacknews -- -c newsDailyReportMd --date 2026-07-19
        case 'newsDailyReportMd':
          await this.newsDailyReportMd(options.date);
          break;
        default:
          console.log(`未找到子命令: ${options.command}`);
          this.printRuntimeGuide();
          break;
      }
    } catch (error) {
      console.error('执行子命令时发生错误:', error);
      exit(1);
    }
  }

  @Option({
    flags: '-c, --command [command]',
    description: '要执行的子命令，例如 aiDailyReport',
  })
  getSubCommand(val: string): string {
    return val;
  }

  @Option({
    flags: '--date [date]',
    description: '报告日期，格式 YYYY-MM-DD。不传则使用当天日期',
  })
  getDate(val: string): string {
    return val;
  }

  private printRuntimeGuide() {
    console.log('HacknewsCommand 运行说明:');
    console.log(
      'for linux npm run cli hacknews -- -c <command> [--date <date>]',
    );
    console.log(
      'for windows  npm run cli -- hacknews -- -c <command> [--date <date>]',
    );
    console.log('');
    console.log('可用子命令:');

    for (const item of this.getCommandDescriptions()) {
      console.log(`  ${item.name.padEnd(20, ' ')}${item.description}`);
    }

    console.log('');
    console.log('示例:');
    console.log('  npm run cli -- hacknews -- -c aiDailyReport');
    console.log(
      '  npm run cli -- hacknews -- -c aiDailyReport --date 2026-07-19',
    );
    console.log('  npm run cli -- hacknews -- -c aiDailyReportMd');
    console.log(
      '  npm run cli -- hacknews -- -c aiDailyReportMd --date 2026-07-19',
    );
    console.log('  npm run cli -- hacknews -- -c newsDailyReportMd');
    console.log(
      '  npm run cli -- hacknews -- -c newsDailyReportMd --date 2026-07-19',
    );
  }

  private getCommandDescriptions() {
    return [
      {
        name: 'aiDailyReport',
        description:
          '生成 HackerNews AI 相关每日报告（JSON），可通过 --date 指定日期（默认当天）',
      },
      {
        name: 'aiDailyReportMd',
        description:
          '生成 HackerNews AI 相关每日报告（Markdown 文件），可通过 --date 指定日期（默认当天）',
      },
      {
        name: 'newsDailyReportMd',
        description:
          '生成 HackerNews 全量新闻每日精选报告（Markdown 文件），面向开发者和 AI 爱好者，可通过 --date 指定日期（默认当天）',
      },
    ];
  }

  private async aiDailyReport(date?: string) {
    const report = await this.hackerNewsService.generateAiDailyReport(date);
    console.log(JSON.stringify(report, null, 2));
  }

  private async aiDailyReportMd(date?: string) {
    const result = await this.hackerNewsService.generateAiDailyReportMd(date);
    console.log(`\n报告日期: ${result.date}`);
    console.log(`新闻数量: ${result.total}`);
    console.log(`文件路径: ${result.filePath}`);
  }

  private async newsDailyReportMd(date?: string) {
    const result = await this.hackerNewsService.generateNewsDailyReportMd(date);
    console.log(`\n报告日期: ${result.date}`);
    console.log(`新闻数量: ${result.total}`);
    console.log(`文件路径: ${result.filePath}`);
  }
}
