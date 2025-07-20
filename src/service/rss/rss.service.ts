import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { XMLParser } from 'fast-xml-parser';
import { saveJsonFileToCsv } from 'src/utils/file';
import { parseRSS } from '../ai/rss';
import * as _ from 'lodash';

@Injectable()
export class RssService {
  constructor() {
    // 空构造函数
  }

  async parseOpml() {
    const filePath = 'output/feeds.opml';
    const opml = fs.readFileSync(filePath, 'utf-8');

    const parser = new XMLParser({
      attributeNamePrefix: '_',
      ignoreAttributes: false,
    });

    const result = await parser.parse(opml);
    const outlines: any = [];

    if (result.opml.body.outline) {
      const outlinesArray = result.opml.body.outline;
      for (const outline of outlinesArray) {
        const type = outline._title;
        if (outline._type === 'rss') {
          outlines.push({
            type,
            title: outline._title,
            url: outline._xmlUrl,
          });
        } else {
          if (outline.outline) {
            const subOutlines = _.isArray(outline.outline)
              ? outline.outline
              : [outline.outline];
            for (const subOutline of subOutlines) {
              if (subOutline._type === 'rss') {
                outlines.push({
                  type,
                  title: subOutline._title,
                  url: subOutline._xmlUrl,
                });
              }
            }
          }
        }
      }
    }

    const useProxys = [
      'Technology',
      'top scoring links : worldnews',
      'Hacker News',
    ];

    for (const outline of outlines) {
      let useProxy = false;
      if (useProxys.indexOf(outline.title) > -1) {
        useProxy = true;
      }

      const feeds = await this.rssParse(outline.url, useProxy);
      console.log(outline.title, `获取到 ${feeds.length} 条数据`);
      // save to csv

      if (feeds.length > 0) {
        const _title = outline.title.replace('/', '-');

        saveJsonFileToCsv(
          `output/rss/${outline.type}/${_title}.csv`,
          feeds.map((f) => {
            delete f.description;
            return f;
          }),
        );
      }
    }
  }

  async rssParse(url, useProxy) {
    try {
      const feed = await parseRSS(url, useProxy);
      return feed;
    } catch (error) {
      console.error(url);
      console.error('Error parsing RSS feed:', error);
      return [];
    }
  }
}
