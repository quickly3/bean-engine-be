import { Command, CommandRunner, Option } from 'nest-commander';
import { GuanService } from 'src/service/guan/guan.service';

@Command({
  name: 'guan',
  description:
    'Guan 相关命令入口。使用 `npm run cli -- guan --help` 查看帮助，使用 `npm run cli -- guan -c <command>` 执行具体子命令。',
})
export class GuanCommand extends CommandRunner {
  constructor(private readonly guanService: GuanService) {
    super();
  }

  async run(_passedParam: string[], options?: any): Promise<void> {
    void _passedParam;

    if (!options?.command) {
      this.printRuntimeGuide();
      return;
    }

    switch (options.command) {
      // npm run cli -- guan -- -c crawlUser -u 218155 -s 1 -e 3 --withAi --init
      case 'crawlUser':
        await this.crawlUser(options);
        break;
      // npm run cli -- guan -- -c profile -u 218155
      case 'profile':
        await this.crawlProfile(options);
        break;
      // npm run cli -- guan -- -c detail -u 218155
      case 'detail':
        await this.crawlDetail(options);
        break;
      // npm run cli -- guan -- -c analyze -u 218155
      case 'analyze':
        await this.analyze(options);
        break;
      default:
        console.log(`未找到子命令: ${options.command}`);
        this.printRuntimeGuide();
        break;
    }
  }

  @Option({
    flags: '-c, --command [command]',
    description: '要执行的子命令，例如 test',
  })
  getSubCommand(val: string): string {
    return val;
  }

  @Option({
    flags: '-u, --uid [uid]',
    description: '观察者网用户 uid',
  })
  getUid(val: string): string {
    return val;
  }

  @Option({
    flags: '-s, --startPage [startPage]',
    description: '文章列表起始页，默认 1',
  })
  getStartPage(val: string): number {
    return Number(val);
  }

  @Option({
    flags: '-b, --batchSize [batchSize]',
    description: '批量处理大小，默认 50',
  })
  getBatchSize(val: string): number {
    return Number(val);
  }

  @Option({
    flags: '--concurrency [concurrency]',
    description: '详情抓取并发数，默认 3',
  })
  getConcurrency(val: string): number {
    return Number(val);
  }

  @Option({
    flags: '--withAi',
    description: '是否在爬取后执行 AI 分析',
  })
  getWithAi(): boolean {
    return true;
  }

  @Option({
    flags: '--init',
    description: '爬取前先删除该用户所有相关内容（文章、评论、资料）',
  })
  getInit(): boolean {
    return true;
  }

  private printRuntimeGuide() {
    console.log('GuanCommand 运行说明:');
    console.log('for linux    npm run cli guan -- -c <command>');
    console.log('for windows  npm run cli -- guan -- -c <command>');
    console.log('');
    console.log('可用子命令:');

    for (const item of this.getCommandDescriptions()) {
      console.log(`  ${item.name.padEnd(20, ' ')}${item.description}`);
    }

    console.log('');
    console.log('示例:');
    console.log('  npm run cli -- guan -- -c test');
    console.log(
      '  npm run cli -- guan -- -c crawlUser -u 218155 -s 1 -e 3 --withAi',
    );
    console.log(
      '  npm run cli -- guan -- -c crawlUser -u 218155 --init  # 爬取前清空旧数据',
    );
    console.log('  npm run cli -- guan -- -c profile -u 218155');
    console.log('  npm run cli -- guan -- -c detail -u 218155 --concurrency 5');
    console.log('  npm run cli -- guan -- -c analyze -u 218155');
  }

  private getCommandDescriptions() {
    return [
      { name: 'test', description: '测试命令' },
      {
        name: 'crawlUser',
        description:
          '完整爬取：资料 + 列表 + 详情(+AI)，需 -u <uid>，可选 --init 先清空旧数据、--concurrency 设置详情并发',
      },
      { name: 'profile', description: '仅抓取用户资料，需 -u <uid>' },
      {
        name: 'detail',
        description: '抓取 pending 文章详情，可选 -u <uid>、--concurrency <n>',
      },
      {
        name: 'analyze',
        description: '对已抓详情文章做 AI 分析，可选 -u <uid>',
      },
    ];
  }

  private async crawlUser(options: any) {
    if (!options?.uid) {
      console.log('请通过 -u <uid> 指定用户 uid');
      return;
    }
    await this.guanService.crawlUser(options.uid, {
      startPage: options.startPage || 1,
      endPage: options.endPage || 999,
      withDetail: true,
      withAi: !!options.withAi,
      init: !!options.init,
      batchSize: options.batchSize || 50,
      detailConcurrency: options.concurrency || 3,
    });
  }

  private async crawlProfile(options: any) {
    if (!options?.uid) {
      console.log('请通过 -u <uid> 指定用户 uid');
      return;
    }
    await this.guanService.crawlUserProfile(options.uid);
  }

  private async crawlDetail(options: any) {
    await this.guanService.crawlPendingArticleDetails(options?.uid, {
      concurrency: options?.concurrency || 3,
    });
  }

  private async analyze(options: any) {
    await this.guanService.analyzeArticles(options?.uid);
  }
}
