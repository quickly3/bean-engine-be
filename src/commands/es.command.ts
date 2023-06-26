import { Command, Positional, Option } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { EsService } from 'src/service/es.service';

@Injectable()
export class EsCommand {
  constructor(private esService: EsService) {}
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
    const resp = await this.esService.getHello();
    console.log(resp);
  }
}
