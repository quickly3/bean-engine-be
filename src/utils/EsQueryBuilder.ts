import { ElasticsearchService } from '@nestjs/elasticsearch';
import * as _ from 'lodash';

export class EsQueryBuilder {
  index: string;
  body: any = {};
  source: string[];
  highlight;
  orderBy;
  paginate = {
    page: 1,
    size: 20,
  };
  query;
  resp: any;
  client: ElasticsearchService;

  constructor(index, client) {
    this.index = index;
    this.client = client;
  }

  setQuery(query) {
    this.query = query;
    this.body.query = query;
  }

  setSource = (source: string[]) => {
    this.source = source;
  };

  setHighlight = (highlight) => {
    this.highlight = highlight;
  };

  setOrderBy = (orderBy) => {
    this.orderBy = orderBy;
    this.body.sort = orderBy;
  };

  setPaginate = (paginate) => {
    this.paginate = paginate;

    const { page, size } = paginate;
    const from = (page - 1) * size;

    this.body.size = size;
    this.body.from = from;
    this.body.track_total_hits = true;
  };

  getIdRes = () => {
    const list = [];
    const hits = _.get(this.resp, 'body.hits.hits');
    if (hits && hits.length > 0) {
      for (const item of hits) {
        const source = item._source;
        source._id = item._id;

        if (item.highlight) {
          source.highlight = item.highlight;
        }
        list.push(source);
      }
    }

    return list;
  };

  search = async () => {
    this.resp = await this.client.search({
      index: this.index,
      body: this.body,
    });

    const total: number = _.get(this.resp, 'body.hits.total.value', 0);
    const query_string = _.get(this.query, 'query_string');
    const current_page = _.get(this.paginate, 'page', 1);
    const from = (this.paginate.page - 1) * this.paginate.size;
    const last_page = total / this.paginate.size;
    const to = from + this.paginate.size;
    const took = _.get(this.resp, 'body.took');
    const data = this.getIdRes();

    const searchResp = {
      total,
      query_string,
      current_page,
      last_page,
      from,
      to,
      per_page: this.paginate.size,
      took,
      data,
    };
    return searchResp;
  };
}
