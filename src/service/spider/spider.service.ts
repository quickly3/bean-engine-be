import { Injectable } from '@nestjs/common';
import Kr36Crawler from './crawlers/kr36.crawler';
import { GuanUserArticleCrawler } from './crawlers/guan.crawler';
import { ConfigService } from '@nestjs/config';
import Kr36DetailCrawler from './crawlers/kr36Detail.crawler';
import * as Papa from 'papaparse';
import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { ChatDeepSeek } from '@langchain/deepseek';
import OschinaCrawler from './crawlers/oschina.crawler';
import { saveJsonFileToCsv } from 'src/utils/file';
import * as moment from 'moment';
import { SearchService } from '../search.service';
import CsdnCrawler from './crawlers/csdn.crawler';

@Injectable()
export class SpiderService {
  constructor(
    private readonly configService: ConfigService,
    private readonly searchService: SearchService,
  ) {}

  async crwal_36kr({ exportToCsv }) {
    const params = {
      configService: this.configService,
      exportToCsv,
    };
    const crawler = new Kr36Crawler(params);
    await crawler.start();
  }

  async detail_36kr(url) {
    const params = {
      configService: this.configService,
    };
    const crawler = new Kr36DetailCrawler(params);

    await crawler.crawlArticle(url);
  }

  async crawlBatch36kr() {
    const inputPath = path.join('output', 'exports', '36kr.csv');
    const outputPath = path.join('output', 'exports', '36kr_with_content.csv');

    const fileContent = fs.readFileSync(inputPath, 'utf-8');
    const results = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
    });

    const urls = results.data.map((row: any) => row.url);
    const params = {
      configService: this.configService,
    };
    const crawler = new Kr36DetailCrawler(params);

    const crawlResults = await crawler.crawlMultipleArticles(urls);

    // Merge crawled content with original data
    const enrichedData = results.data.map((row: any) => {
      const matchedResult = crawlResults.success.find(
        (item) => item.url === row.url,
      );
      return {
        ...row,
        content: matchedResult?.content || '',
        crawl_success: matchedResult ? true : false,
      };
    });

    // Convert to CSV and save
    const csv = Papa.unparse(enrichedData);
    fs.writeFileSync(outputPath, csv, 'utf-8');
    return {
      total: urls.length,
      success: crawlResults.success.length,
      failed: crawlResults.failed.length,
      outputPath,
    };
  }

  async genTodayReport() {
    // const inputPath = path.join('output', 'exports', '36kr.csv');

    // const fileContent = fs.readFileSync(inputPath, 'utf-8');
    // const results = Papa.parse(fileContent, {
    //   header: true,
    //   skipEmptyLines: true,
    // });

    // const data = results.data;

    const data = await this.searchService.todayReport();

    data.map((d, i) => {
      d.id = i + 1;
    });

    const idTitles = data.map((d) => {
      return { id: d.id, title: d.title };
    });

    const filePath = path.join('output', 'today_cate.txt');

    console.log(idTitles.length, '标题数量');
    const resp = await this.cateByAi(JSON.stringify(idTitles));
    fs.writeFileSync(filePath, resp);

    // const filePath = path.join('output', 'resp.txt');
    // const resp = fs.readFileSync(filePath, 'utf-8');

    // match resp 字符串里  ```josn ```中 中间的内容
    const reg = /```json([\s\S]*?)```/g;
    const match = reg.exec(resp);
    let josnResp = '';
    if (!match) {
      return;
    }
    josnResp = match[1].trim();

    const resp2 = JSON.parse(josnResp);

    data.map((d) => {
      d.cate = '其他';
      resp2.map((r) => {
        if (r.ids.includes(d.id)) {
          d.cate = r.cate;
        }
      });
    });

    // 将data保存到csv文件中
    saveJsonFileToCsv('output/today_report.csv', data);
    const gpData = _.groupBy(data, (d) => d.cate);

    // gpData to markdown file
    const gpDataKeys = Object.keys(gpData);

    const date = moment().format('YYYY-MM-DD');
    let md = `## 互联网摸鱼日报【加量版】(${date})\n`;
    gpDataKeys.map((key) => {
      const _data = gpData[key];
      md += `### ${key}\n`;
      _data.map((d, i) => {
        md += `${i + 1}. [${d.title}](${d.url})\n`;
      });
    });
    fs.writeFileSync(`output/today_report.md`, md);
  }

  async genWeekReport() {
    const data = await this.searchService.weekReport();

    let titles = data.map((d) => d.title);
    titles = _.uniq(titles);

    const idTitles = titles.map((d, i) => {
      return { id: i + 1, title: d };
    });
    saveJsonFileToCsv('output/week_titles.csv', idTitles);
    return;

    const filePath = path.join('output', 'week_cate.txt');
    console.log(idTitles.length, '标题数量');
    const resp = await this.cateByAi(JSON.stringify(idTitles));
    fs.writeFileSync(filePath, resp);

    // const filePath = path.join('output', 'resp.txt');
    // const resp = fs.readFileSync(filePath, 'utf-8');

    // match resp 字符串里  ```josn ```中 中间的内容
    const reg = /```json([\s\S]*?)```/g;
    const match = reg.exec(resp);
    let josnResp = '';
    if (!match) {
      return;
    }
    josnResp = match[1].trim();

    const resp2 = JSON.parse(josnResp);

    data.map((d) => {
      d.cate = '其他';
      resp2.map((r) => {
        if (r.ids.includes(d.id)) {
          d.cate = r.cate;
        }
      });
    });

    // 将data保存到csv文件中
    saveJsonFileToCsv('output/today_report.csv', data);
    const gpData = _.groupBy(data, (d) => d.cate);

    // gpData to markdown file
    const gpDataKeys = Object.keys(gpData);

    const date = moment().format('YYYY-MM-DD');
    let md = `## 互联网摸鱼日报【加量版】(${date})\n`;
    gpDataKeys.map((key) => {
      const _data = gpData[key];
      md += `### ${key}\n`;
      _data.map((d, i) => {
        md += `${i + 1}. [${d.title}](${d.url})\n`;
      });
    });
    fs.writeFileSync(`output/today_report.md`, md);
  }

  async parseByAi(content) {
    console.log('开始解析文章:');
    const model = new ChatDeepSeek({
      apiKey: this.configService.get('deepseek.DS_KEY'),
      model: 'deepseek-chat-v3-0324',
    });

    const messages = [
      // new SystemMessage('总结文章内容，100字以内,不要有废话，不要显示字数'),
      new HumanMessage(content),
    ];

    const resp = await model.invoke(messages);
    console.log('解析完成,摘要长度:', resp.content.length);
    return resp.content;
  }

  async cateByAi(content) {
    console.log('开始解析文章:');
    console.log(content.length, '内容长度');
    const model = new ChatDeepSeek({
      apiKey: this.configService.get('deepseek.DS_KEY'),
      model: 'deepseek-chat',
    });

    const messages = [
      new SystemMessage(
        "根据输入的json数据中的title进行分类，返回json格式数据{cate:'',ids:[]},将IT互联网创新相关分类放前面",
      ),
      new HumanMessage(content),
    ];

    const resp = await model.invoke(messages);
    console.log('解析完成,结果长度:', resp.content.length);
    return resp.content.toString();
  }

  async list_oc(url) {
    const params = {
      configService: this.configService,
    };
    const crawler = new OschinaCrawler(params);

    await crawler.crawlProjects(url);
  }

  async crawlCsdn() {
    const params = {
      configService: this.configService,
    };
    const crawler = new CsdnCrawler(params);
    return await crawler.crawlHomePage();
  }

  async crawGuanUserArticles() {
    const params = {
      uid: '259912'
    };
    const crawler = new GuanUserArticleCrawler(params);
    const data = await crawler.crawlAllPages();
  }
}
