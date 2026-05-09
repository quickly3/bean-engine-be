import { Command, CommandRunner, Option } from 'nest-commander';
import { WbgService } from 'src/service/wbg.service';

@Command({
  name: 'wbg',
  description: 'wbg',
})
export class WbgCommand extends CommandRunner {
  constructor(private readonly wbgService: WbgService) {
    super();
  }

  async run(_passedParam: string[], options?: any): Promise<void> {
    try {
      if (!options?.command) {
        this.printRuntimeGuide();
        return;
      }

      switch (options.command) {
        case 'importCountries':
          // npm run cli -- wbg -- -c importCountries
          await this.wbgService.importCountries();
          break;
        case 'importWbgData':
          //   npm run cli -- wbg -- -c importWbgData
          await this.wbgService.importWbgData();
          break;
        case 'importIndicators':
          //   npm run cli -- wbg -- -c importIndicators
          await this.wbgService.importIndicators();
          break;
        case 'transIndicators':
          //   npm run cli -- wbg -- -c transIndicators
          await this.wbgService.transIndicators();
          break;
        default:
          console.log(`未找到子命令: ${options.command}`);
          this.printRuntimeGuide();
          break;
      }
    } catch (error) {
      console.error('执行命令时发生错误:', error);
    }
  }

  @Option({
    flags: '-c, --command [command]',
    description: '要执行的子命令，例如 importCountries、importWbgData',
  })
  getSubCommand(val: string): string {
    return val;
  }

  private printRuntimeGuide() {
    console.log('WbgCommand 运行说明:');
    console.log('for linux npm run cli wbg -- -c <command>');
    console.log('for windows npm run cli -- wbg -- -c <command>');
    console.log('');
    console.log('可用子命令:');

    for (const item of this.getCommandDescriptions()) {
      console.log(`  ${item.name.padEnd(20, ' ')}${item.description}`);
    }

    console.log('');
    console.log('示例:');
    console.log('  npm run cli -- wbg -- -c importCountries');
  }

  private getCommandDescriptions() {
    return [
      {
        name: 'importCountries',
        description: '从 WBG API 拉取国家列表并写入 WbgCountry 表',
      },
      {
        name: 'importWbgData',
        description: '导入 WBG source.csv 到 WbgDataSource',
      },
      {
        name: 'importIndicators',
        description: '按数据源导入指标到 WbgIndicator',
      },
      {
        name: 'transIndicators',
        description: '翻译 WbgIndicator.value 到 value_cn',
      },
    ];
  }
}
