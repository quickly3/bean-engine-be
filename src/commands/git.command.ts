import { Command, CommandRunner } from 'nest-commander';
import { GitService } from 'src/service/git.service';
import { AiToolService } from 'src/service/ai/aiTool.service';
import { saveJsonFileToCsv } from 'src/utils/file';

@Command({
  name: 'git:search-repo',
  description: 'search repo',
})
export class GitCommand extends CommandRunner {
  constructor(
    private readonly gitService: GitService,
    private readonly aiToolService: AiToolService,
  ) {
    super();
  }

  async run(_passedParam: string[], _options?: any): Promise<void> {
    void _passedParam;
    void _options;
    const name = 'awesome';
    const list = await this.gitService.searchRepo({ name });
    console.log([list.items[0]]);
    const list_cn: any = await this.aiToolService.transJsonArr([list.items[0]]);
    console.log(list_cn);
    const list_cn_json = JSON.parse(list_cn);
    saveJsonFileToCsv('output/git_awesemo.csv', list_cn_json);
  }
}
