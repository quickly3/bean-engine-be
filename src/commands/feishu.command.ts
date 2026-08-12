import { Command, CommandRunner, Option } from 'nest-commander';
import { FeishuRobot } from 'src/service/feishu/feishuRobot';
import { ConfigService } from '@nestjs/config';
import { exit } from 'process';

@Command({
  name: 'feishu',
  description:
    '飞书相关命令入口。使用 `npm run cli -- feishu --help` 查看帮助，使用 `npm run cli -- feishu -c <command>` 执行具体子命令。',
})
export class FeishuCommand extends CommandRunner {
  feishu: FeishuRobot;
  constructor(private readonly configService: ConfigService) {
    super();
    this.feishu = new FeishuRobot(this.configService);
  }

  async run(_passedParam: string[], options?: any): Promise<void> {
    void _passedParam;

    if (!options?.command) {
      this.printRuntimeGuide();
      return;
    }

    try {
      switch (options.command) {
        // yarn cli feishu -c companyPostReadStatus
        case 'companyPostReadStatus':
          await this.companyPostReadStatus(options.pageSize);
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
    description: '要执行的子命令，例如 companyPostReadStatus',
  })
  getSubCommand(val: string): string {
    return val;
  }

  @Option({
    flags: '--pageSize [pageSize]',
    description: '查询最近消息条数，默认 5',
  })
  getPageSize(val: string): number {
    return parseInt(val, 10) || 5;
  }

  private printRuntimeGuide() {
    console.log('FeishuCommand 运行说明:');
    console.log(
      'for linux npm run cli feishu -- -c <command> [--pageSize <n>]',
    );
    console.log(
      'for windows  npm run cli -- feishu -- -c <command> [--pageSize <n>]',
    );
    console.log('');
    console.log('可用子命令:');

    for (const item of this.getCommandDescriptions()) {
      console.log(`  ${item.name.padEnd(20, ' ')}${item.description}`);
    }

    console.log('');
    console.log('示例:');
    console.log('  npm run cli -- feishu -- -c companyPostReadStatus');
    console.log(
      '  npm run cli -- feishu -- -c companyPostReadStatus --pageSize 10',
    );
  }

  private getCommandDescriptions() {
    return [
      {
        name: 'companyPostReadStatus',
        description:
          '查询发送到公司群的最近几条消息的已读情况，可通过 --pageSize 指定条数（默认 5）',
      },
    ];
  }

  private async companyPostReadStatus(pageSize = 3) {
    await this.feishu.set_app_access_token();
    const result = await this.feishu.getCompanyPostReadStatus(pageSize);
    console.log(JSON.stringify(result, null, 2));
  }
}
