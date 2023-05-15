import { Injectable } from '@nestjs/common';

import _ from 'lodash';
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

    return queryBuilder.search();
  }
}
