import { Injectable } from '@nestjs/common';

import * as _ from 'lodash';
import { ES_INDEX } from 'src/enum/enum';
import { EsQueryBuilder } from 'src/utils/EsQueryBuilder';
import { parseQueryString } from './utils';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class SearchService {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}
  async getAll(payload) {
    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );
    const query = parseQueryString(payload);
    queryBuilder.setQuery(query);

    const { search_type, sortBy } = payload;
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
}
