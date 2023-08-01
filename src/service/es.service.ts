import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ES_INDEX } from 'src/enum/enum';
import { EsQueryBuilder } from 'src/utils/EsQueryBuilder';
import * as _ from 'lodash';
import { Neo4jService } from 'nest-neo4j/dist/neo4j.service';
import { NeoQueryBuilder } from 'src/utils/NeoBuilder';
import {
  CreateRelationsParamsDto,
  CreateRelationsValuesDto,
} from 'src/utils/neo.dto';

@Injectable()
export class EsService {
  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly neo4jService: Neo4jService,
  ) {}
  async syncArticles(size = 10, skip = 0) {
    let current = 0;
    let total = 0;
    const query = {
      query_string: {
        query: 'source:juejin',
      },
    };

    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );

    queryBuilder.setQuery(query);
    queryBuilder.setScroll('1m');
    queryBuilder.setSize(size);
    queryBuilder.setSource(['author_id', 'title', 'tag', 'category']);

    let resp = await queryBuilder.search();
    total = resp.total;
    let scroll_id = resp.scroll_id;

    const neoQueryBuilder = new NeoQueryBuilder(this.neo4jService);

    await neoQueryBuilder.createUniqueKey('Article', '_id');
    const r_pramas: CreateRelationsParamsDto = {
      r_type: 'WROTE',
      a_type: 'Author',
      b_type: 'Article',
      a_field: 'id',
      b_field: '_id',
    };

    const r_pramas_t: CreateRelationsParamsDto = {
      r_type: 'HAS_TAG',
      a_type: 'Article',
      b_type: 'Tag',
      a_field: '_id',
      b_field: 'name',
    };

    const r_pramas_c: CreateRelationsParamsDto = {
      r_type: 'HAS_CATE',
      a_type: 'Article',
      b_type: 'Category',
      a_field: '_id',
      b_field: 'name',
    };

    const objects = resp.data.map((a) => {
      return {
        _id: a._id,
        title: a.title,
        author_id: a.author_id,
        tag: a.tag,
        category: a.category,
      };
    });

    const r_values: CreateRelationsValuesDto[] = resp.data.map((a) => {
      return {
        a_value: a.author_id,
        b_value: a._id,
      };
    });

    const r_values_t1 = resp.data.map((a) => {
      const list = [];
      for (const t of a.tag) {
        list.push({
          a_value: a._id,
          b_value: t,
        });
      }
      return list;
    });

    const r_values_t: CreateRelationsValuesDto[] = _.flatten(r_values_t1);

    const r_values_c: CreateRelationsValuesDto[] = resp.data.map((a) => {
      return {
        a_value: a._id,
        b_value: a.category,
      };
    });
    console.log(r_values_t);
    console.log(r_values_c);

    if (resp.to > skip) {
      await neoQueryBuilder.createByObjets('Article', objects);
      await neoQueryBuilder.createRelationsByObjets(r_pramas, r_values);
      await neoQueryBuilder.createRelationsByObjets(r_pramas_t, r_values_t);
      await neoQueryBuilder.createRelationsByObjets(r_pramas_c, r_values_c);
    }

    current = resp.to;
    console.log(`${current}/${total}`);

    while (scroll_id) {
      scroll_id = resp.scroll_id;

      resp = await queryBuilder.scrollSerch();
      scroll_id = resp.scroll_id;

      const objects = resp.data.map((a) => {
        return {
          _id: a._id,
          title: a.title,
          author_id: a.author_id,
          tag: a.tag,
          category: a.category,
        };
      });

      const r_values: CreateRelationsValuesDto[] = resp.data.map((a) => {
        return {
          a_value: a.author_id,
          b_value: a._id,
        };
      });

      const r_values_t1 = resp.data.map((a) => {
        const list = [];
        for (const t of a.tag) {
          list.push({
            a_value: a._id,
            b_value: t,
          });
        }
        return list;
      });

      const r_values_t: CreateRelationsValuesDto[] = _.flatten(r_values_t1);

      const r_values_c: CreateRelationsValuesDto[] = resp.data.map((a) => {
        return {
          a_value: a._id,
          b_value: a.category,
        };
      });

      if (!skip || resp.to <= skip) {
        await neoQueryBuilder.createByObjets('Article', objects);
        await neoQueryBuilder.createRelationsByObjets(r_pramas, r_values);
        await neoQueryBuilder.createRelationsByObjets(r_pramas_t, r_values_t);
        await neoQueryBuilder.createRelationsByObjets(r_pramas_c, r_values_c);
      }

      current = resp.to;
      console.log(`${current}/${total}`);
    }
  }

  async syncAuthors(size = 10, skip = 0) {
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
    queryBuilder.setSource(['user_id', 'user_name', 'company']);
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
        id: a.user_id,
        name: a.user_name,
      };
    });

    const r_pramas: CreateRelationsParamsDto = {
      r_type: 'WORK_FOR',
      a_type: 'Author',
      b_type: 'Company',
      a_field: 'id',
      b_field: 'name',
    };

    const r_values: CreateRelationsValuesDto[] = resp.data
      .filter((a) => {
        return !!a.company;
      })
      .map((a) => {
        return {
          a_value: a.user_id,
          b_value: a.company,
        };
      });

    if (resp.to > skip) {
      await neoQueryBuilder.createByObjets('Author', objects);
      await neoQueryBuilder.createRelationsByObjets(r_pramas, r_values);
    }

    current = resp.to;
    console.log(`${current}/${total}`);

    while (scroll_id) {
      scroll_id = resp.scroll_id;

      resp = await queryBuilder.scrollSerch();
      scroll_id = resp.scroll_id;

      const objects = resp.data.map((a) => {
        return {
          id: a.user_id,
          name: a.user_name,
        };
      });
      const r_values: CreateRelationsValuesDto[] = resp.data
        .filter((a) => {
          return !!a.company;
        })
        .map((a) => {
          return {
            a_value: a.user_id,
            b_value: a.company,
          };
        });
      if (!skip || resp.to <= skip) {
        await neoQueryBuilder.createByObjets('Author', objects);
        await neoQueryBuilder.createRelationsByObjets(r_pramas, r_values);
      }

      current = resp.to;
      console.log(`${current}/${total}`);
    }
  }

  async syncFollowee(size = 100) {
    let current = 0;
    let total = 0;
    const query = {
      query_string: {
        query: 'source:juejin',
      },
    };

    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.FOLLOWEE,
      this.elasticsearchService,
    );

    queryBuilder.setQuery(query);
    queryBuilder.setScroll('1m');
    queryBuilder.setSize(size);
    queryBuilder.setOrderBy({
      user_id: 'desc',
    });

    let resp = await queryBuilder.search();
    total = resp.total;
    let scroll_id = resp.scroll_id;

    const neoQueryBuilder = new NeoQueryBuilder(this.neo4jService);

    const r_pramas: CreateRelationsParamsDto = {
      r_type: 'FOLLOWEE',
      a_type: 'Author',
      b_type: 'Author',
      a_field: 'id',
      b_field: 'id',
    };

    const r_values: CreateRelationsValuesDto[] = resp.data.map((a) => {
      return {
        a_value: a.user_id,
        b_value: a.followee_id,
      };
    });

    await neoQueryBuilder.createRelationsByObjets(r_pramas, r_values);

    current = resp.to;
    console.log(`${current}/${total}`);

    while (scroll_id) {
      scroll_id = resp.scroll_id;

      resp = await queryBuilder.scrollSerch();
      scroll_id = resp.scroll_id;

      const r_values: CreateRelationsValuesDto[] = resp.data.map((a) => {
        return {
          a_value: a.user_id,
          b_value: a.followee_id,
        };
      });

      await neoQueryBuilder.createRelationsByObjets(r_pramas, r_values);

      current = resp.to;
      console.log(`${current}/${total}`);
    }
  }

  async syncFollower(size = 100) {
    let current = 0;
    let total = 0;
    const query = {
      query_string: {
        query: 'source:juejin',
      },
    };

    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.FOLLOWER,
      this.elasticsearchService,
    );

    queryBuilder.setQuery(query);
    queryBuilder.setScroll('1m');
    queryBuilder.setSize(size);
    queryBuilder.setOrderBy({
      user_id: 'desc',
    });

    let resp = await queryBuilder.search();
    total = resp.total;

    let scroll_id = resp.scroll_id;

    const neoQueryBuilder = new NeoQueryBuilder(this.neo4jService);

    const r_pramas: CreateRelationsParamsDto = {
      r_type: 'FOLLOWEE',
      a_type: 'Author',
      b_type: 'Author',
      a_field: 'id',
      b_field: 'id',
    };

    const r_values: CreateRelationsValuesDto[] = resp.data.map((a) => {
      return {
        a_value: a.followee_id,
        b_value: a.user_id,
      };
    });

    await neoQueryBuilder.createRelationsByObjets(r_pramas, r_values);

    current = resp.to;
    console.log(`${current}/${total}`);

    while (scroll_id) {
      scroll_id = resp.scroll_id;

      resp = await queryBuilder.scrollSerch();
      scroll_id = resp.scroll_id;

      const r_values: CreateRelationsValuesDto[] = resp.data.map((a) => {
        return {
          a_value: a.followee_id,
          b_value: a.user_id,
        };
      });

      await neoQueryBuilder.createRelationsByObjets(r_pramas, r_values);

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

    const chunked_data = _.chunk(resp, 10000);
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

      await neoQueryBuilder.createByObjets('Company', objs);
      break;
    }
  }

  async syncTag() {
    const query = {
      query_string: {
        query: 'source:juejin',
      },
    };

    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );

    queryBuilder.setQuery(query);
    // const size = 20000;
    const size = 20000;

    const resp = await queryBuilder.getFieldAggByQueryBuilder('tag', size);

    const chunked_data = _.chunk(resp, 10000);
    let current = 0;
    const total = resp.length;

    const neoQueryBuilder = new NeoQueryBuilder(this.neo4jService);
    await neoQueryBuilder.createUniqueKey('Tag', 'name');

    for (const group of chunked_data) {
      current += group.length;
      console.log(`${current}/${total}`);
      const objs = group.map((c: any) => {
        return {
          name: c.key,
        };
      });

      await neoQueryBuilder.createByObjets('Tag', objs);
      break;
    }
  }

  async syncCate() {
    const query = {
      query_string: {
        query: 'source:juejin',
      },
    };

    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );

    queryBuilder.setQuery(query);
    // const size = 20000;
    const size = 20000;

    const resp = await queryBuilder.getFieldAggByQueryBuilder('category', size);

    const chunked_data = _.chunk(resp, 10000);
    let current = 0;
    const total = resp.length;

    const neoQueryBuilder = new NeoQueryBuilder(this.neo4jService);
    await neoQueryBuilder.createUniqueKey('Category', 'name');

    for (const group of chunked_data) {
      current += group.length;
      console.log(`${current}/${total}`);
      const objs = group.map((c: any) => {
        return {
          name: c.key,
        };
      });

      await neoQueryBuilder.createByObjets('Category', objs);
      break;
    }
  }

  async syncFolloweTag(size = 100) {
    let current = 0;
    let total = 0;
    const query = {
      query_string: {
        query: 'source:juejin',
      },
    };

    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.FOLLOW_TAG,
      this.elasticsearchService,
    );

    queryBuilder.setQuery(query);
    queryBuilder.setScroll('1m');
    queryBuilder.setSize(size);
    queryBuilder.setSource(['user_id', 'tag_name']);
    queryBuilder.setOrderBy({
      user_id: 'desc',
    });

    let resp = await queryBuilder.search();
    total = resp.total;
    let scroll_id = resp.scroll_id;

    const neoQueryBuilder = new NeoQueryBuilder(this.neo4jService);

    const r_pramas: CreateRelationsParamsDto = {
      r_type: 'FOLLOW_TAG',
      a_type: 'Author',
      b_type: 'Tag',
      a_field: 'id',
      b_field: 'name',
    };

    const r_values: CreateRelationsValuesDto[] = resp.data.map((a) => {
      return {
        a_value: a.user_id,
        b_value: a.tag_name,
      };
    });

    await neoQueryBuilder.createRelationsByObjets(r_pramas, r_values);

    current = resp.to;
    console.log(`${current}/${total}`);

    while (scroll_id) {
      scroll_id = resp.scroll_id;

      resp = await queryBuilder.scrollSerch();
      scroll_id = resp.scroll_id;

      const r_values: CreateRelationsValuesDto[] = resp.data.map((a) => {
        return {
          a_value: a.user_id,
          b_value: a.tag_name,
        };
      });

      await neoQueryBuilder.createRelationsByObjets(r_pramas, r_values);

      current = resp.to;
      console.log(`${current}/${total}`);
    }
  }
}
