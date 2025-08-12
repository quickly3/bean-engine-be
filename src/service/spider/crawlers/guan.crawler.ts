import axios from 'axios';
import * as _ from 'lodash';
import {
  GuanUserConfig,
  GuanRawArticleItem,
} from '../interface/guan.interface';
import { saveJsonFileToCsv } from 'src/utils/file';

export class GuanUserArticleCrawler {
  private baseUrl = 'https://user.guancha.cn/user/get-published-list';
  private config: GuanUserConfig;

  constructor(config: GuanUserConfig) {
    this.config = {
      isSelf: 0,
      startPage: 1,
      endPage: 999,
      ...config,
    };
  }

  async crawlAllPages(): Promise<GuanRawArticleItem[]> {
    const allArticles: GuanRawArticleItem[] = [];

    for (
      let page = this.config.startPage;
      page <= this.config.endPage;
      page++
    ) {
      try {
        console.log(page);
        const articles = await this.crawlPage(page);
        if (articles.length === 0) {
          break; // 如果没有更多文章，停止爬取
        }
        allArticles.push(...articles);
      } catch (error) {
        console.error(`Error crawling page ${page}:`, error);
        break;
      }
    }
    saveJsonFileToCsv(`output/guan/user_${this.config.uid}.csv`, allArticles);
    return allArticles;
  }

  async crawlPage(pageNo: number): Promise<GuanRawArticleItem[]> {
    const params = {
      page_no: pageNo,
      uid: this.config.uid,
      isSelf: this.config.isSelf,
    };

    const response = await axios.get(this.baseUrl, { params });
    const data: GuanRawArticleItem[] = _.get(response, 'data.data.items');

    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data;
  }
}
