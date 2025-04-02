import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { ChatDeepSeek } from '@langchain/deepseek';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

export default class Kr36DetailCrawler {
  private esClient: Client;

  private configService: ConfigService;
  constructor(params) {
    const { configService } = params;
    this.configService = configService;
    this.esClient = new Client({ node: this.configService.get('es.node') });
  }

  async crawlArticle(url) {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      console.log('开始爬取文章:', url);
      await page.goto(url, { waitUntil: 'load' });
      const content = await page.content();

      // Parse the HTML and extract the article content
      const $ = cheerio.load(content);
      const articleContent = $('.articleDetailContent').text().trim();

      const articleTitle = $('.article-title').text().trim();
      console.log('爬取成功,文章长度:', articleContent.length);
      const summary = await this.parseByAi(articleContent);
      return {
        title: articleTitle,
        content: articleContent,
        summary,
      };
    } catch (error) {
      console.error(`Error fetching article from ${url}:`, error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  async parseByAi(content) {
    return '';
    console.log('开始解析文章:');
    const model = new ChatDeepSeek({
      apiKey: this.configService.get('deepseek.DS_KEY'),
      model: 'deepseek-chat',
    });

    const messages = [
      new SystemMessage('总结文章内容，100字以内,不要显示字数'),
      new HumanMessage(content),
    ];

    const resp = await model.invoke(messages);
    console.log('解析完成,摘要长度:', resp.content.length);
    return resp.content;
  }
}
