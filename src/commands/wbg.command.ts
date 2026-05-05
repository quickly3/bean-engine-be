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

  async run(passedParam: string[], options?: any): Promise<void> {
    try {
      switch (options.command) {
        case 'importWbgData':
          //   npm run cli -- wbg -- -c importWbgData
          await this.wbgService.importWbgData();
          break;
        case 'importIndicators':
          //   npm run cli -- wbg -- -c importIndicators
          await this.wbgService.importIndicators();
          break;
        default:
          console.log(`未找到子命令: ${options.command}`);
          break;
      }
    } catch (error) {
      console.error('执行命令时发生错误:', error);
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
}
