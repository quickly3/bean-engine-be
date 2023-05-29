import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ES_INDEX } from 'src/enum/enum';
import { EsQueryBuilder } from 'src/utils/EsQueryBuilder';
import { AuthorService } from './author.service';

@Injectable()
export class GraphService {
  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly authorSerive: AuthorService,
  ) {}
  async getTotalGraph() {
    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );

    const query = {
      query_string: {
        query: '*:*',
      },
    };

    queryBuilder.setQuery(query);
    const resp = await queryBuilder.getFieldAggByQueryBuilder('source');

    const data = {};

    for (const item of resp) {
      data[item.key] = item.doc_count;
    }

    return data;
  }

  async getLastDayData() {
    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );

    const query = {
      query_string: {
        query: 'created_at:[now-1d/d TO now/d]',
      },
    };

    queryBuilder.setQuery(query);
    const resp = await queryBuilder.getFieldAggByQueryBuilder('source');

    const data = {};

    for (const item of resp) {
      data[item.key] = item.doc_count;
    }

    return data;
  }

  async getTagsAgg(payload) {
    const { author = '', source = '', size = 10 } = payload;
    return this.authorSerive.getAuthorTags(author, size);
  }
}
