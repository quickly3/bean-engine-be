import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class SyncService {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}
  async getHello() {
    const resp = await this.elasticsearchService.search({
      index: 'article',
    });

    return resp;
  }
}
