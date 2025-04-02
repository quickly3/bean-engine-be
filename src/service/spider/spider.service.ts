import { Injectable } from '@nestjs/common';
import Kr36Crawler from './crawlers/kr36.crawler';
import { ConfigService } from '@nestjs/config';
import Kr36DetailCrawler from './crawlers/kr36Detail.crawler';
import * as Papa from 'papaparse';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SipderService {
  constructor(private readonly configService: ConfigService) {}

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
}
