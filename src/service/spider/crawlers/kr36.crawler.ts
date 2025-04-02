import axios from 'axios';
import * as moment from 'moment';
import { Client } from '@elastic/elasticsearch';
import * as _ from 'lodash';
import { ConfigService } from '@nestjs/config';

interface TemplateMaterial {
  widgetTitle: string;
  itemId: number;
  authorName?: string;
  authorRoute?: string;
  themeName?: string;
  summary?: string;
  publishTime: number;
}

interface KrItem {
  templateMaterial: TemplateMaterial;
}

interface Article {
  title: string;
  url: string;
  author?: string;
  author_url?: string;
  source: string;
  tag?: string;
  summary?: string;
  created_at: string;
  created_year: string;
}

export default class Kr36Crawler {
  private readonly domain: string = 'https://www.36kr.com';
  private readonly source: string = '36kr';
  private esClient: Client;

  private configService: ConfigService;

  constructor(params) {
    const { configService } = params;
    this.configService = configService;
    this.esClient = new Client({ node: this.configService.get('es.node') });
  }

  async start(): Promise<void> {
    try {
      const startUrl = 'https://www.36kr.com/information/web_news/';
      const response = await axios.get(startUrl);
      await this.parse(response.data);
    } catch (error) {
      console.error('Crawling failed:', error);
    }
  }

  private async parse(responseText: string): Promise<void> {
    const pageCallbackMatch = responseText.match(
      /(?<="pageCallback":")(.*?)(?=")/,
    );
    if (!pageCallbackMatch) {
      return;
    }

    const pageCallback = pageCallbackMatch[1];
    const firstListMatch = responseText.match(
      /(?<=<script>window.initialState=)(.*?)(?=<\/script>)/,
    );

    if (!firstListMatch) {
      return;
    }

    const firstList = JSON.parse(firstListMatch[1]);
    const items = _.get(firstList, 'information.informationList.itemList');

    await this.itemsImport(items);
    await this.getNextQuery(pageCallback);
  }

  private async itemsImport(items: KrItem[]): Promise<boolean> {
    const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
    const today = moment().format('YYYY-MM-DD');

    const startTime = moment(yesterday).endOf('d').unix();
    const endTime = moment(today).endOf('d').unix();

    const bulk: any[] = [];
    let toNext = true;

    for (const item of items) {
      const t = item.templateMaterial;
      if (!t.widgetTitle) {
        continue;
      }

      const createdAt = Math.floor(t.publishTime / 1000);

      if (createdAt > endTime) {
        console.log('too new');
        continue;
      }

      if (createdAt < startTime) {
        toNext = false;
        console.log('too old');
        continue;
      }

      const dateTimeObj = moment(t.publishTime);
      const doc: Article = {
        title: t.widgetTitle,
        url: `${this.domain}/p/${t.itemId}`,
        source: this.source,
        created_at: dateTimeObj.utc().format(),
        created_year: dateTimeObj.format('YYYY'),
      };

      if (t.authorName) {
        doc.author = t.authorName;
      }

      if (t.authorRoute) {
        const userId = t.authorRoute.replace('detail_author?userId=', '');
        doc.author_url = `${this.domain}/user/${userId}`;
      }

      if (t.themeName) {
        doc.tag = t.themeName;
      }

      if (t.summary) {
        doc.summary = t.summary;
      }

      bulk.push({ index: { _index: 'article' } });
      bulk.push(doc);
    }

    if (bulk.length > 0) {
      await this.esClient.bulk({ body: bulk });
    }

    return toNext;
  }

  private async getNextQuery(pageCallback: string): Promise<void> {
    const flowUrl = 'https://gateway.36kr.com/api/mis/nav/ifm/subNav/flow';
    const payload = {
      partner_id: 'web',
      timestamp: Date.now(),
      param: {
        subnavType: 1,
        subnavNick: 'web_news',
        pageSize: 100,
        pageEvent: 1,
        pageCallback: pageCallback,
        siteId: 1,
        platformId: 2,
      },
    };

    try {
      const response = await axios.post(flowUrl, payload);
      await this.nextPageParse(response.data, payload);
    } catch (error) {
      console.error('Failed to fetch next page:', error);
    }
  }

  private async nextPageParse(resp: any, payload: any): Promise<void> {
    const pageCallback = _.get(resp, 'data.pageCallback');
    const items = _.get(resp, 'data.itemList');
    const hasNextPage = _.get(resp, 'data.hasNextPage');

    const toNext = await this.itemsImport(items);

    if (hasNextPage === 1 && toNext) {
      await this.getNextQuery(pageCallback);
    }
  }
}
