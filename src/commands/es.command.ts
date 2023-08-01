import { Command, Positional, Option } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { JuejinNeoService } from 'src/service/juejinNeo.service';

@Injectable()
export class EsCommand {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  // constructor(private juejinNeoService: JuejinNeoService) {}
  @Command({
    command: 'sync:neo4j <source>',
    describe: 'create a user',
  })
  async sync(
    @Positional({
      name: 'source',
      describe: 'the es source',
      type: 'string',
    })
    source: string,
  ) {
    // await this.juejinNeoService.syncJuejin();
  }
}
