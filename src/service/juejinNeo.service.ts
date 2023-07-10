import { Injectable } from '@nestjs/common';
import { EsService } from './es.service';
import { Neo4jService } from 'nest-neo4j';
import { NeoQueryBuilder } from 'src/utils/NeoBuilder';

@Injectable()
export class JuejinNeoService {
  constructor(
    private esService: EsService,
    private readonly neo4jService: Neo4jService,
  ) {}
  async syncJuejin() {
    const neoQueryBuilder = new NeoQueryBuilder(this.neo4jService);

    // console.log('Truncate neo4j');
    // await neoQueryBuilder.truncate();
    // console.log('Drop all constraints');
    // await neoQueryBuilder.dropAllConstraints();
    // console.log('Import company data');
    // await this.esService.syncCompany();

    console.log('Import author data and build comapny-author relation');
    await neoQueryBuilder.dropByType('Author');
    await this.esService.syncAuthors(1000);

    console.log('Import author data and build author-article relation');
    await neoQueryBuilder.dropRelationByType('FOLLOWEE');
    await this.esService.syncFollowee(3000);
    await this.esService.syncFollower(2000);

    // await this.esService.syncFolloweTag();
    // await this.esService.syncArticles();
  }
}
