import { ElasticsearchService } from '@nestjs/elasticsearch';
import * as _ from 'lodash';
import * as fs from 'fs';

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
  size: 20;
  from: 0;
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
    this.body.highlight = highlight;
  };

  setSize = (size) => {
    this.size = size;
    this.body.size = size;
  };

  setFrom = (from) => {
    this.from = from;
    this.body.from = from;
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

  setQueryBody = (body) => {
    this.body = body;
  };

  aggs = async () => {
    this.resp = await this.client.search({
      index: this.index,
      body: this.body,
    });
    return this.resp;
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
    const from = this.from;
    const last_page = total / this.paginate.size;
    const to = from + this.size;
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

  rawSearch = async () => {
    this.resp = await this.client.search({
      index: this.index,
      body: this.body,
    });
    return this.resp;
  };

  autoComplete = async (text, field) => {
    this.body = {
      suggest: {
        _suggest: {
          text,
          completion: {
            field,
          },
        },
      },
      _source: false,
    };

    const resp = await this.client.search({
      index: this.index,
      body: this.body,
    });
    let respFormated = [];

    const options: any = _.get(resp, 'body.suggest._suggest[0].options');

    if (options) {
      respFormated = options.map((item) => item.text);
    }

    return respFormated;
  };

  getHistogram = async (clearInterval) => {
    this.body = {
      query: this.query,
      aggs: {
        source_date_histogram: {
          date_histogram: {
            field: 'created_at',
            calendar_interval: clearInterval,
            format: 'yyyy-MM-dd',
          },
        },
      },
      size: 0,
    };

    const resp = await this.client.search({
      index: this.index,
      body: this.body,
    });

    const buckets = _.get(
      resp,
      'body.aggregations.source_date_histogram.buckets',
    );
    const data = buckets.map((item) => {
      return {
        date: item['key_as_string'],
        count: item['doc_count'],
      };
    });

    return {
      data,
      query_string: this.query.query_string,
    };
  };

  getWordsCloud = async (size) => {
    this.body = {
      query: this.query,
      aggs: {
        title_words_cloud: {
          terms: {
            field: 'title',
            size: size,
          },
        },
      },
      size: 0,
    };
    const resp = await this.client.search({
      index: this.index,
      body: this.body,
    });

    let cloud_words = _.get(
      resp,
      'body.aggregations.title_words_cloud.buckets',
    );

    const data = fs.readFileSync('src/utils/stopwords.txt').toString();
    const stop_words = data.split('\n').map((item) => item.trim());

    cloud_words = cloud_words.filter((i) => {
      return stop_words.indexOf(i.key) == -1;
    });
    return {
      data: cloud_words,
      query_string: this.query.query_string,
    };
  };

  getFieldAggByQueryBuilder = async (field, size = 0) => {
    const agg_name = `${field}_terms`;
    const aggs: any = {};
    aggs[agg_name] = {
      terms: {
        field,
      },
    };

    if (size !== 0) {
      aggs[agg_name].terms.size = size;
    }

    const body = {
      query: this.query,
      aggs,
      size: 0,
    };
    console.log(body);
    this.setQueryBody(body);

    const resp = await this.aggs();
    const datas = _.get(resp, `body.aggregations.${agg_name}.buckets`);
    return datas;
  };
}
