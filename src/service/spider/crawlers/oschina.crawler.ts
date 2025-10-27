import axios from 'axios';
import  moment from 'moment';
import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import * as cheerio from 'cheerio';
import * as Papa from 'papaparse';

export default class OschinaCrawler {
  private configService: ConfigService;
  private esClient: Client;
  private exportToCsv: boolean;
  private csvPath: string;

  constructor(params: { configService: ConfigService; exportToCsv?: boolean }) {
    const { configService, exportToCsv = false } = params;
    this.configService = configService;
    this.esClient = new Client({ node: this.configService.get('es.node') });
    this.exportToCsv = exportToCsv;
    const today = moment().format('YYYY-MM-DD');
    const fileName = `36kr_${today}.csv`;
    this.csvPath = path.join('output', 'exports', fileName);
  }

  async fetchUrl(url: string): Promise<string> {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching URL:', error);
      return '';
    }
  }

  parseProjectItems(html: string): any[] {
    const $ = cheerio.load(html);
    const items: any[] = [];

    $('.project-item').each((i, elem) => {
      const title = $(elem).find('.header a').attr('title') || '';
      const projectName = $(elem).find('.project-name').text().trim();
      const projectTitle = $(elem).find('.project-title').text().trim();
      const description = $(elem).find('.description p').text().trim();
      const favorites = $(elem)
        .find('.item:contains("收藏")')
        .text()
        .replace('收藏', '')
        .trim();
      const comments = $(elem)
        .find('.item:contains("评论")')
        .text()
        .replace('评论', '')
        .trim();

      items.push({
        title,
        projectName,
        projectTitle,
        description,
        favorites,
        comments,
      });
    });

    return items;
  }

  async saveToCsv(data: any[], outputPath: string): Promise<void> {
    const csv = Papa.unparse(data);
    fs.writeFileSync(outputPath, csv);
    console.log(`CSV saved to: ${outputPath}`);
  }

  async crawlProjects(url: string): Promise<void> {
    const html = await this.fetchUrl(url);
    const items = this.parseProjectItems(html);

    if (this.exportToCsv) {
      await this.saveToCsv(items, this.csvPath);
    }

    // Optionally save to elasticsearch
    if (this.esClient) {
      for (const item of items) {
        await this.esClient.index({
          index: 'oschina_projects',
          body: item,
        });
      }
    }
  }
}
