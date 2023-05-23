import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ES_INDEX } from 'src/enum/enum';
import { EsQueryBuilder } from 'src/utils/EsQueryBuilder';
import * as _ from 'lodash';
import { parseAuthorQueryString } from './utils';

@Injectable()
export class AuthorService {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}
  async getAll(payload) {
    const { sortBy } = payload;
    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.AUTHOR,
      this.elasticsearchService,
    );

    const query = parseAuthorQueryString(payload);
    queryBuilder.setQuery(query);

    let orders = {};
    switch (sortBy.value) {
      case 'power':
        orders = {
          power: 'desc',
          _score: 'desc',
        };
        break;
      case 'post_article_count':
        orders = {
          post_article_count: 'desc',
          _score: 'desc',
        };
        break;
      case 'level':
        orders = {
          level: 'desc',
          _score: 'desc',
        };
        break;
      default:
        orders = {
          post_article_count: 'desc',
          _score: 'desc',
        };
    }

    queryBuilder.setOrderBy(orders);

    const highlight = {
      fields: {
        user_name: {},
      },
    };

    queryBuilder.setHighlight(highlight);

    const resp = await queryBuilder.search();

    const authors = resp.data.map((author) => {
      return `"${author}"`;
    });

    if (authors.length > 0) {
      const author_str = '(' + authors.join(' || ') + ')';
      const author_tags = await this.getAuthorTagsAggs(author_str);
      const author_cates = await this.getAuthorTagsCates(author_str);
    }

    return resp;
  }

  getAuthorTagsAggs = async (author, size = 100, source = '') => {
    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.AUTHOR,
      this.elasticsearchService,
    );
    let query = '*:*';

    if (source.trim() !== '') {
      query += ` && source:${source}`;
    }

    if (author.trim() !== '') {
      query += ` && author:${author}`;
    }

    const body = {
      query: {
        query_string: {
          query: query,
        },
      },
      aggs: {
        author_terms: {
          terms: {
            field: 'author',
            size: size,
          },
          aggs: {
            tag_terms: {
              terms: {
                field: 'tag',
                size: 100,
              },
            },
          },
        },
      },
      size: 0,
    };

    queryBuilder.setQueryBody(body);
    const resp = await queryBuilder.rawSearch();
    const buckets = _.get(resp, 'body.aggregations.author_terms.buckets');
  };
}
