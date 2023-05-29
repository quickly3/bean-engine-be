import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ES_INDEX } from 'src/enum/enum';
import { EsQueryBuilder } from 'src/utils/EsQueryBuilder';

@Injectable()
export class ArticleService {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}
  async getHistogram(query_string, calendar_interval = 'month') {
    const query = {
      query_string: {
        query: query_string,
      },
    };

    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );

    queryBuilder.setQuery(query);

    const resp = await queryBuilder.getHistogram(calendar_interval);
    return resp.data;
  }
  async getAuthorTermsAgg() {
    const resp = await this.elasticsearchService.search({
      index: 'article',
    });

    return resp;
  }
}
