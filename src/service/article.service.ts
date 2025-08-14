import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ES_INDEX } from 'src/enum/enum';
import { urlToId } from 'src/utils/es';
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

  async queryByString(query_string) {
    const query = {
      query_string: {
        query: query_string,
      },
    };

    const queryBuilder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );
    queryBuilder.setSource(['title', 'url', 'source', 'summary']);
    queryBuilder.setSize(10);
    queryBuilder.setQuery(query);
    const resp = await queryBuilder.search();
    return resp;
  }

  async getAuthorTermsAgg() {
    const resp = await this.elasticsearchService.search({
      index: 'article',
    });

    return resp;
  }
  async bulkInsert(articles: any[]) {
    const body = articles.flatMap((article) => [
      { index: { _index: ES_INDEX.ARTICLE, _id: urlToId(article.url) } },
      article,
    ]);

    const { body: response } = await this.elasticsearchService.bulk({
      index: ES_INDEX.ARTICLE,
      body,
    });

    return response;
  }
}
