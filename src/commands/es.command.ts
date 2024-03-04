import { Command, Positional } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { execSync } from 'child_process';
import { SearchService } from 'src/service/search.service';

@Injectable()
export class EsCommand {
  constructor(private readonly searchService: SearchService) {}
  @Command({
    command: 'crawl <source>',
  })
  async crawl(
    @Positional({
      name: 'source',
    })
    source: string,
  ) {
    process.chdir('scrapy');

    let python = 'python';
    if (process.env.NODE_ENV === 'local') {
      python = 'python3';
    }

    const cmd = `${python} -m scrapy crawl ${source}`;
    await execSync(cmd, { encoding: 'utf-8' });
  }
  @Command({
    command: 'crawl:all',
  })
  async crawlAll() {
    this.searchService.crawlLastDay();
    await this.searchService.esClearLast();
  }

  @Command({
    command: 'esClearLast',
  })
  async esClearLast() {
    await this.searchService.esClearLast();
  }

  @Command({
    command: 'esClear <source>',
  })
  async esClear(
    @Positional({
      name: 'source',
    })
    source: string,
  ) {
    await this.searchService.esClear(source);
  }
}
