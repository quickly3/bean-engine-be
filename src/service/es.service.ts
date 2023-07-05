import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ES_INDEX } from 'src/enum/enum';
import { EsQueryBuilder } from 'src/utils/EsQueryBuilder';
import * as _ from 'lodash';
import { Neo4jService } from 'nest-neo4j/dist/neo4j.service';
import { NeoQueryBuilder } from 'src/utils/NeoBuilder';

@Injectable()
export class EsService {
  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly neo4jService: Neo4jService,
  ) {}
  async syncArticles(syncFunc = undefined) {
    const query = {
      query_string: {
        query: 'source:juejin && author:"躺平使者"',
      },
    };

    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );

    queryBuilder.setQuery(query);
    queryBuilder.setScroll('1m');
    queryBuilder.setSize(2);
    queryBuilder.setSource([
      'title',
      'author',
      'author_id',
      // 'summary',
      'category',
      'tag',
    ]);

    let resp = await queryBuilder.search();
    let scroll_id = resp.scroll_id;

    while (scroll_id) {
      resp = await queryBuilder.scrollSerch();
      scroll_id = resp.scroll_id;
      console.log(resp.data);
    }
  }

  async syncAuthors(size = 10, skip = undefined) {
    let current = 0;
    let total = 0;
    const query = {
      query_string: {
        query: 'source:juejin',
      },
    };

    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.AUTHOR,
      this.elasticsearchService,
    );

    queryBuilder.setQuery(query);
    queryBuilder.setScroll('1m');
    queryBuilder.setSize(size);
    queryBuilder.setSource(['user_name', 'company']);
    queryBuilder.setOrderBy({
      user_name: 'desc',
    });

    let resp = await queryBuilder.search();
    total = resp.total;
    let scroll_id = resp.scroll_id;

    const neoQueryBuilder = new NeoQueryBuilder(this.neo4jService);
    await neoQueryBuilder.createUniqueKey('Author', 'id');

    const objects = resp.data.map((a) => {
      return {
        id: a._id,
        name: a.user_name,
      };
    });

    const relations = resp.data
      .filter((a) => {
        return !!a.company;
      })
      .map((a) => {
        return {
          a: { type: 'Author', field: 'id', value: a._id },
          b: { type: 'Company', field: 'name', value: a.company },
        };
      });

    if (resp.to > skip) {
      await neoQueryBuilder.createByObjets('Author', objects);
      await neoQueryBuilder.createRelationsByObjets('WORK_FOR', relations);
    }

    current = resp.to;
    console.log(`${current}/${total}`);

    while (scroll_id) {
      scroll_id = resp.scroll_id;

      resp = await queryBuilder.scrollSerch();
      scroll_id = resp.scroll_id;

      const objects = resp.data.map((a) => {
        return {
          id: a._id,
          name: a.user_name,
        };
      });
      const relations = resp.data.map((a) => {
        return {
          a: { type: 'Author', field: 'id', value: a._id },
          b: { type: 'Company', field: 'name', value: a.company },
        };
      });
      if (!skip || resp.to <= skip) {
        await neoQueryBuilder.createByObjets('Author', objects);
        await neoQueryBuilder.createRelationsByObjets('WORK_FOR', relations);
      }

      current = resp.to;
      console.log(`${current}/${total}`);
    }
  }

  async syncCompany() {
    const query = {
      query_string: {
        query: 'source:juejin',
      },
    };

    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.AUTHOR,
      this.elasticsearchService,
    );

    queryBuilder.setQuery(query);
    // const size = 20000;
    const size = 20000;

    const resp = await queryBuilder.getFieldAggByQueryBuilder('company', size);

    const chunked_data = _.chunk(resp, 100);
    let current = 0;
    const total = resp.length;

    const neoQueryBuilder = new NeoQueryBuilder(this.neo4jService);
    await neoQueryBuilder.createUniqueKey('Company', 'name');

    for (const group of chunked_data) {
      current += group.length;
      console.log(`${current}/${total}`);
      const objs = group.map((c: any) => {
        return {
          name: c.key,
        };
      });

      // await neoQueryBuilder.truncate();
      await neoQueryBuilder.createByObjets('Company', objs);
    }
  }
}
