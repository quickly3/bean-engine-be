import { Injectable } from '@nestjs/common';

import * as _ from 'lodash';
import { ES_INDEX } from 'src/enum/enum';
import { EsQueryBuilder } from 'src/utils/EsQueryBuilder';
import { parseQueryString } from './utils';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import moment from 'moment';
import { execSync } from 'child_process';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly prismaService: PrismaService,
  ) {}
  async getAll(payload) {
    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );
    const query = parseQueryString(payload);

    queryBuilder.setQuery(query);

    const { search_type, sortBy, page, size = 20 } = payload;

    const from = (page - 1) * size;

    queryBuilder.setSize(size);
    queryBuilder.setFrom(from);

    if (search_type == 'simple') {
      queryBuilder.setSource(['title']);
    } else {
      const highlight = {
        fields: {
          summary: {},
          title: {},
        },
      };
      queryBuilder.setHighlight(highlight);
    }

    let orders = {};

    switch (sortBy) {
      case 'date':
        orders = {
          created_at: 'desc',
          _score: 'desc',
          created_year: 'desc',
          title: 'asc',
        };

        break;
      case 'score':
        orders = {
          _score: 'desc',
          created_year: 'desc',
          created_at: 'desc',
          title: 'asc',
        };
        break;
      case 'multi':
        orders = {
          _score: 'desc',
          created_year: 'desc',
          created_at: 'desc',
          title: 'asc',
        };
        break;
      case 'viewed':
        orders = {
          view_count: 'desc',
          created_year: 'desc',
          created_at: 'desc',
          title: 'asc',
        };
        break;
      case 'like':
        orders = {
          digg_count: 'desc',
          created_year: 'desc',
          created_at: 'desc',
          title: 'asc',
        };
        break;
      case 'comments':
        orders = {
          comment_count: 'desc',
          created_year: 'desc',
          created_at: 'desc',
          title: 'asc',
        };
        break;
      case 'collected':
        orders = {
          collect_count: 'desc',
          created_year: 'desc',
          created_at: 'desc',
          title: 'asc',
        };
        break;
      default:
        orders = {
          created_at: 'desc',
          _score: 'desc',
          created_year: 'desc',
          title: 'asc',
        };
    }

    queryBuilder.setOrderBy(orders);

    const resp = await queryBuilder.search();

    const { data } = resp;
    if (data.length > 0) {
      resp.data = data.map((item) => {
        if (
          item.highlight &&
          item.highlight.summary &&
          item.highlight.summary.length > 0
        ) {
          item.summary = item.highlight.summary[0];
        }

        if (
          item.highlight &&
          item.highlight.title &&
          item.highlight.title.length > 0
        ) {
          item.title = item.highlight.title[0];
        }
        return item;
      });
    }

    return resp;
  }

  async getTags(params) {
    const { source } = params;
    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );

    const body = {
      query: {
        query_string: {
          query: '*:*',
        },
      },
      aggs: {
        tags: {
          terms: {
            field: 'tag',
            size: 20,
          },
        },
      },
      size: 0,
    };
    if (source !== 'all') {
      body.query.query_string.query += ` && source:${source}`;
    }

    queryBuilder.setQueryBody(body);

    const resp = await queryBuilder.aggs();
    const tags = _.get(resp, 'body.aggregations.tags.buckets');
    return tags;
  }

  async getCategories(params) {
    const { source } = params;
    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );

    const body = {
      query: {
        query_string: {
          query: '*:*',
        },
      },
      aggs: {
        categories: {
          terms: {
            field: 'category',
            size: 20,
          },
        },
      },
      size: 0,
    };
    if (source !== 'all') {
      body.query.query_string.query += ` && source:${source}`;
    }

    queryBuilder.setQueryBody(body);

    const resp = await queryBuilder.aggs();
    const categories = _.get(resp, 'body.aggregations.categories.buckets');
    return categories;
  }

  async autoComplete(params) {
    const { keywords: text } = params;

    if (!text || text.trim() === '') {
      return [];
    }

    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );
    const field = 'title.auto_completion';
    queryBuilder.setSource(['title']);
    return queryBuilder.autoComplete(text, field);
  }

  async getArticleHistogram(payload) {
    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );
    const query = parseQueryString(payload);
    queryBuilder.setQuery(query);
    const resp = await queryBuilder.getHistogram('day');
    return resp;
  }
  async getWordsCloud(payload) {
    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );
    const query = parseQueryString(payload);
    queryBuilder.setQuery(query);
    const resp = await queryBuilder.getWordsCloud(1000);
    return resp;
  }
  async getAuthorTermsAgg(payload) {
    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );
    const query = parseQueryString(payload);
    queryBuilder.setQuery(query);

    const authors = await queryBuilder.getFieldAggByQueryBuilder('author', 100);
    return {
      data: authors,
      query_string: query.query_string,
    };
  }
  async getTagsTermsAgg(payload) {
    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );
    const query = parseQueryString(payload);
    queryBuilder.setQuery(query);
    const tags = await queryBuilder.getFieldAggByQueryBuilder('tag', 100);
    return {
      data: tags,
      query_string: query.query_string,
    };
  }
  async getCatesTermsAgg(payload) {
    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );
    const query = parseQueryString(payload);
    queryBuilder.setQuery(query);
    const categories = await queryBuilder.getFieldAggByQueryBuilder(
      'category',
      100,
    );
    return {
      data: categories,
      query_string: query.query_string,
    };
  }

  async dailyMd() {
    const yesterday = moment().add('-1', 'days').format('YYYY-MM-DD');
    const today = moment().format('YYYY-MM-DD');

    const escn = await this.getLastDayArticleByQuery('source:escn');
    const juejin = await this.getLastDayArticleByQuery(
      'source:juejin && tag:news',
    );
    const infoq = await this.getLastDayArticleByQuery('source:infoq');
    const oschina = await this.getLastDayArticleByQuery(
      'source:oschina && tag:news',
    );
    // const cnblogs = await this.getLastDayArticleByQuery(
    //   'source:cnblogs && tag:news',
    // );

    const tai = await this.getLastDayArticleByQuery(
      'source:tai && tag:news',
      50,
    );

    const krs = await this.getLastDayArticleByQuery('source:36kr', 50);

    const escn0 = _.get(escn, '[0].summary', '');
    const escn_title = escn0.replace(`(${yesterday})`, '');
    const resp = {
      title: `互联网摸鱼日报(${today})`,
      data: [
        { title: '钛媒体', data: tai },
        { title: '36氪新闻', data: krs },
        { title: '开源中国资讯', data: oschina },
        { title: '掘金资讯', data: juejin },
        { title: escn_title, data: escn },
        { title: 'InfoQ 热门话题', data: infoq },
      ],
    };

    return resp;
  }

  async todayReport() {
    const escn = await this.getLastDayArticleByQuery('source:escn');
    const juejin = await this.getLastDayArticleByQuery(
      'source:juejin && tag:news',
    );
    const infoq = await this.getLastDayArticleByQuery('source:infoq');
    const oschina = await this.getLastDayArticleByQuery(
      'source:oschina && tag:news',
    );
    const cnblogs = await this.getLastDayArticleByQuery(
      'source:cnblogs && tag:news',
    );
    const krs = await this.getLastDayArticleByQuery('source:36kr', 300);

    return _.concat(escn, juejin, infoq, oschina, cnblogs, krs);
  }

  async weekReport() {
    const escn = await this.getLastWeekArticleByQuery('source:escn');
    const juejin = await this.getLastWeekArticleByQuery(
      'source:juejin && tag:news',
    );
    const infoq = await this.getLastWeekArticleByQuery('source:infoq');
    const oschina = await this.getLastWeekArticleByQuery(
      'source:oschina && tag:news',
    );
    const cnblogs = await this.getLastWeekArticleByQuery(
      'source:cnblogs && tag:news',
    );
    const krs = await this.getLastWeekArticleByQuery('source:36kr');

    console.log('escn', escn.length);
    console.log('juejin', juejin.length);
    console.log('infoq', infoq.length);
    console.log('oschina', oschina.length);
    console.log('cnblogs', cnblogs.length);
    console.log('krs', krs.length);

    return _.concat(escn, juejin, infoq, oschina, cnblogs, krs);
  }

  async dailyKr() {
    const today = moment().format('YYYY-MM-DD');

    const krs = await this.getLastDayArticleByQuery('source:36kr', 50);

    const resp = {
      title: `36Kr新闻(${today})`,
      data: [{ title: '36Kr新闻', data: krs }],
    };

    return resp;
  }

  async getLastDayArticleByQuery(query_string, size = 20) {
    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );

    const lastDay = moment().add('-1', 'days').format('YYYY-MM-DD');
    const body = {
      query: {
        query_string: {
          query: `${query_string} && created_at:${lastDay}`,
        },
      },
      size: size,
      sort: [
        {
          created_at: {
            order: 'desc',
          },
        },
      ],
    };

    queryBuilder.setQueryBody(body);
    const resp = await queryBuilder.search();
    return resp.data;
  }

  async getLastWeekArticleByQuery(query_string) {
    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );

    const dateStart = moment().add('-1', 'w').startOf('w').toISOString();
    const dateEnd = moment().add('-1', 'w').endOf('w').toISOString();

    console.log('dateStart', dateStart);
    console.log('dateEnd', dateEnd);

    const body = {
      query: {
        query_string: {
          query: `${query_string} && created_at:[${dateStart} TO ${dateEnd}]`,
        },
      },
      size: 10000,
      sort: [
        {
          created_at: {
            order: 'desc',
          },
        },
      ],
    };

    queryBuilder.setQueryBody(body);
    const resp = await queryBuilder.search();
    return resp.data;
  }

  async dailyGitHub(params) {
    const tags = [];
    const { since, lan, spl } = params;

    if (since) {
      tags.push(since);
    }

    if (lan) {
      tags.push(lan);
    }

    if (spl) {
      tags.push(spl);
    }

    let query_string = 'source:github';
    if (tags.length > 0) {
      const tags_string = tags.join(' && ');
      query_string += ` && tag:(${tags_string})`;
    }

    const github = await this.getLastDayArticleByQuery(query_string, 25);
    const yesterday = moment().add('-1', 'days').format('YYYY-MM-DD');
    const resp = {
      title: `GitHub Trending（${yesterday}`,
      data: [
        {
          title: 'GitHub Trending',
          data: github,
        },
      ],
    };
    return resp;
  }

  async esClearLast() {
    const del_ids: any[] = [];
    const lastDay = moment().subtract(1, 'days').format('YYYY-MM-DD');

    const params = {
      index: 'article',
      scroll: '30s', // how long between scroll requests. should be small!
      size: 100,
      body: {
        query: {
          query_string: {
            query: `source:* && -source:chatgpt && created_at:[${lastDay} TO *]`,
          },
        },
      },
      _source: ['url'],
    };

    const response = await this.elasticsearchService.search(params);

    let hits: any[] = _.get(response, 'body.hits.hits');
    let scroll_id = _.get(response, 'body._scroll_id');

    while (hits && hits.length > 0) {
      for (const value of hits) {
        const url = _.get(value, '_source.url');
        const tags = _.get(value, '_source.tag') || [];
        if (!del_ids[url]) {
          del_ids[url] = [value._id];
        } else {
          if (tags.indexOf('news') > -1) {
            del_ids.unshift(value._id);
          } else {
            del_ids[url].push(value._id);
          }
        }
      }

      const response = await this.elasticsearchService.scroll({
        scroll_id: scroll_id,
        scroll: '30s',
      });

      hits = _.get(response, 'body.hits.hits');
      scroll_id = _.get(response, 'body._scroll_id');
    }

    const count = Object.keys(del_ids).length;
    let current = 0;

    for (const url of Object.keys(del_ids)) {
      const ids = del_ids[url];
      current++;
      if (ids.length > 0) {
        const _id = ids[0];
        const p = {
          index: 'article',
          body: {
            query: {
              query_string: {
                query: `url:"${url}" && -_id:"${_id}"`,
              },
            },
          },
        };
        await this.elasticsearchService.deleteByQuery(p);
      }
      console.log(`${current}/${count}`);
    }
  }

  crawlLastDay() {
    process.chdir('scrapy');

    const spiderNames = [
      'escn_new',
      'jianshu_daily',
      'infoq_daily',
      'sf_daily',
      'juejin_daily',
      'cnblogs_daily',
      'cnblogs_news_daily',
      'csdn_daily',
      'oschina_daily',
      'oschina_news_daily',
      'oschina_project_daily',
      'itpub_z_daily',
      'data_whale_daily',
      'ali_dev_daily',
    ];
    const python = 'python3';

    for (const name of spiderNames) {
      const cmd = `${python} -m scrapy crawl ${name}`;
      try {
        console.log(`Start of ${name}`);
        execSync(cmd, { encoding: 'utf-8' });
        console.log(`End of ${name}`);
      } catch (error) {
        console.error(error);
      }
    }
  }

  async esClear(source) {
    const del_ids: any[] = [];

    let query_string = `source:* && -source:chatgpt`;
    if (source) {
      query_string = `source:${source} && -source:chatgpt`;
    }

    const params = {
      index: 'article',
      scroll: '30s', // how long between scroll requests. should be small!
      size: 100,
      body: {
        query: {
          query_string: {
            query: query_string,
          },
        },
      },
      _source: ['url'],
    };

    const response = await this.elasticsearchService.search(params);

    let hits: any[] = _.get(response, 'body.hits.hits');
    let scroll_id = _.get(response, 'body._scroll_id');

    while (hits && hits.length > 0) {
      for (const value of hits) {
        const url = _.get(value, '_source.url');
        const tags = _.get(value, '_source.tag') || [];
        if (!del_ids[url]) {
          del_ids[url] = [value._id];
        } else {
          if (tags.indexOf('news') > -1) {
            del_ids.unshift(value._id);
          } else {
            del_ids[url].push(value._id);
          }
        }
      }

      const response = await this.elasticsearchService.scroll({
        scroll_id: scroll_id,
        scroll: '30s',
      });

      hits = _.get(response, 'body.hits.hits');
      scroll_id = _.get(response, 'body._scroll_id');
    }

    const count = Object.keys(del_ids).length;
    let current = 0;

    for (const url of Object.keys(del_ids)) {
      const ids = del_ids[url];
      current++;
      if (ids.length > 0) {
        const _id = ids[0];
        const p = {
          index: 'article',
          body: {
            query: {
              query_string: {
                query: `url:"${url}" && -_id:"${_id}"`,
              },
            },
          },
        };
        await this.elasticsearchService.deleteByQuery(p);
      }
      console.log(`${current}/${count}`);
    }
  }

  async getHackerNews(payload) {
    const { page, size, category } = payload;
    const take = size || 20;
    const skip = (page - 1) * take;

    const where: any = {};
    if (category && category !== '所有') {
      where.category = category;
    }

    const total = await this.prismaService.hackNews.count({
      where,
    });
    const data = await this.prismaService.hackNews.findMany({
      take,
      skip,
      orderBy: {
        createdAt: 'desc',
      },
      where,
    });

    return {
      total,
      data,
      page,
      size: take,
    };
  }
}
