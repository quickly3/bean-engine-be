import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';
// import { chromium } from 'playwright';
import { chromium } from 'playwright-extra';

import * as cheerio from 'cheerio';
import { ChatDeepSeek } from '@langchain/deepseek';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { sleep } from 'openai/core';

export default class Kr36DetailCrawler {
  private esClient: Client;

  private configService: ConfigService;
  constructor(params) {
    const { configService } = params;
    this.configService = configService;
    this.esClient = new Client({ node: this.configService.get('es.node') });
  }

  async crawlArticle(url) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const stealth = require('puppeteer-extra-plugin-stealth')();
    chromium.use(stealth);
    const browser = await chromium.launch();
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    try {
      console.log('开始爬取文章:', url);
      const response = await page.goto(url, { waitUntil: 'load' });
      console.log('Status code:', response.status());
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

  async crawlMultipleArticles(urls: string[]) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const stealth = require('puppeteer-extra-plugin-stealth')();
    chromium.use(stealth);
    const browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-web-security',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-gpu',
      ],
    });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    const results = {
      success: [],
      failed: [],
    };
    const total = urls.length;
    let count = 0;
    console.log('开始爬取文章:');
    try {
      for (const url of urls) {
        count++;
        console.log(`爬取进度: ${count}/${total}`, url);
        try {
          const response = await page.goto(url, { waitUntil: 'load' });
          console.log('Status code:', response.status());

          const content = await page.content();

          const $ = cheerio.load(content);
          const articleContent = $('.articleDetailContent').text().trim();
          const articleTitle = $('.article-title').text().trim();

          console.log('爬取成功,文章长度:', articleContent.length);
          const summary = await this.parseByAi(articleContent);

          results.success.push({
            url,
            title: articleTitle,
            content: articleContent,
            summary,
          });
        } catch (error) {
          console.error(`Error fetching article from ${url}:`, error);
          results.failed.push({ url, error: error.message });
        }
        await sleep(3000);
      }
    } finally {
      await browser.close();
    }

    console.log(
      `爬取完成，成功: ${results.success.length}，失败: ${results.failed.length}`,
    );
    return results;
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
