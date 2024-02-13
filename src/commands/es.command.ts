import { Command, Positional, Option } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { execSync } from 'child_process';

@Injectable()
export class EsCommand {
  @Command({
    command: 'crawl <source>',
  })
  async sync(
    @Positional({
      name: 'source',
    })
    source: string,
  ) {
    process.chdir('scrapy');

    const cmd = `python -m scrapy crawl ${source}`;
    const resp = await execSync(cmd, { encoding: 'utf-8' });

    console.log(resp);
  }
}
