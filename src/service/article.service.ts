import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ES_INDEX } from 'src/enum/enum';
import { urlToId } from 'src/utils/es';
import { EsQueryBuilder } from 'src/utils/EsQueryBuilder';

interface Article {
  url: string;
  title: string;
  source: string;
  summary: string;
  [key: string]: any;
}

@Injectable()
export class ArticleService {
  private readonly logger = new Logger(ArticleService.name);

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  private createQueryBuilder(queryString: string): EsQueryBuilder {
    const query = {
      query_string: { query: queryString },
    };
    const builder = new EsQueryBuilder(
      ES_INDEX.ARTICLE,
      this.elasticsearchService,
    );
    builder.setQuery(query);
    return builder;
  }

  async getHistogram(queryString: string, calendarInterval: string = 'month') {
    try {
      const queryBuilder = this.createQueryBuilder(queryString);
      const response = await queryBuilder.getHistogram(calendarInterval);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get histogram: ${error.message}`);
      throw error;
    }
  }

  async queryByString(queryString: string) {
    try {
      const queryBuilder = this.createQueryBuilder(queryString);
      queryBuilder.setSource(['title', 'url', 'source', 'summary']);
      queryBuilder.setSize(10);
      return await queryBuilder.search();
    } catch (error) {
      this.logger.error(`Failed to query by string: ${error.message}`);
      throw error;
    }
  }

  async getAuthorTermsAgg() {
    try {
      return await this.elasticsearchService.search({
        index: ES_INDEX.ARTICLE,
        body: {
          aggs: {
            authors: {
              terms: { field: 'author.keyword', size: 10 },
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get author terms aggregation: ${error.message}`,
      );
      throw error;
    }
  }

  async bulkInsert(articles: Article[]) {
    try {
      const operations = articles.flatMap((article) => [
        { index: { _index: ES_INDEX.ARTICLE, _id: urlToId(article.url) } },
        article,
      ]);

      const { body: response } = await this.elasticsearchService.bulk({
        index: ES_INDEX.ARTICLE,
        body: operations,
      });

      return response;
    } catch (error) {
      this.logger.error(`Failed to bulk insert articles: ${error.message}`);
      throw error;
    }
  }
}
