import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { GitService } from 'src/service/git.service';
import { AiToolService } from 'src/service/ai/aiTool.service';
import { saveJsonFileToCsv } from 'src/utils/file';

@Injectable()
export class GitCommand {
  constructor(
    private readonly gitService: GitService,
    private readonly aiToolService: AiToolService,
  ) {}
  @Command({
    command: 'git:search-repo',
    describe: 'search repo',
  })
  async git() {
    const name = 'awesome';
    const list = await this.gitService.searchRepo({ name });
    console.log([list.items[0]]);
    const list_cn: any = await this.aiToolService.transJsonArr([list.items[0]]);
    console.log(list_cn);
    const list_cn_json = JSON.parse(list_cn);
    saveJsonFileToCsv('output/git_awesemo.csv', list_cn_json);

    return list_cn;
  }
}
