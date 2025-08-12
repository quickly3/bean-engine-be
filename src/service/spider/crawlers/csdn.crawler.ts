import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { chromium } from 'playwright-extra';
import * as cheerio from 'cheerio';
import * as moment from 'moment';

export default class CsdnCrawler {
  private esClient: Client;
  private configService: ConfigService;

  constructor(params: { configService: ConfigService }) {
    const { configService } = params;
    this.configService = configService;
    this.esClient = new Client({ node: configService.get('es.node') });
  }

  async crawlHomePage() {
    const stealth = require('puppeteer-extra-plugin-stealth')();
    chromium.use(stealth);
    const browser = await chromium.launch();
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });

    try {
      const page = await context.newPage();
      await page.goto('https://www.csdn.net', { waitUntil: 'networkidle' });
      const content = await page.content();

      const articles = await this.parseHomeContent(content);
      if (articles.length > 0) {
        const bulkBody = articles.flatMap((doc) => [
          { index: { _index: 'article' } },
          doc,
        ]);
        await this.esClient.bulk({ body: bulkBody });
      }

      return {
        success: articles.length,
        articles,
      };
    } catch (error) {
      console.error('CSDN抓取失败:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  private async parseHomeContent(content: string) {
    const $ = cheerio.load(content);
    const articles = [];
    const scripts = $('script').get();

    for (const script of scripts) {
      const text = $(script).text();
      if (text.includes('__INITIAL_STATE__')) {
        const jsonStr = text
          .replace('window.__INITIAL_STATE__=', '')
          .replace(/;$/, '');
        const data = JSON.parse(jsonStr);
        const headhots = data.pageData.data['www-headhot'] || [];
        const headlines = data.pageData.data['www-Headlines'] || [];

        const items = [...headhots, ...headlines].map((item) => ({
          title: item.title,
          summary: item.description,
          url: item.url,
          source: 'csdn',
          created_at: moment().format('YYYY-MM-DD'),
        }));

        articles.push(...items);
      }
    }

    return articles;
  }
}
