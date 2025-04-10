import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { XMLParser } from 'fast-xml-parser';
import * as rssParser from 'rss-parser';
import { saveJsonFileToCsv } from 'src/utils/file';

@Injectable()
export class RssService {
  constructor() {
    // 空构造函数
  }

  async parseOpml() {
    const filePath = 'output/Feeder-2025-04-09.opml';
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
        if (outline._type === 'rss') {
          outlines.push({
            title: outline._title,
            url: outline._xmlUrl,
          });
        } else {
          if (outline.outline) {
            const subOutlines = outline.outline;
            for (const subOutline of subOutlines) {
              if (subOutline._type === 'rss') {
                outlines.push({
                  title: subOutline._title,
                  url: subOutline._xmlUrl,
                });
              }
            }
          }
        }
      }
    }
    for (const outline of outlines) {
      console.log(outline.title);
      const feed = await this.rssParse(outline.url);
      // save to csv
      saveJsonFileToCsv(`output/${outline.title}.csv`, feed);
    }
  }

  async rssParse(url) {
    try {
      const parser = new rssParser({
        requestOptions: {
          rejectUnauthorized: false,
        },
      });
      const feed = await parser.parseURL(url);
      return feed;
    } catch (error) {
      console.error(url);
      console.error('Error parsing RSS feed:', error);
      return [];
    }
  }
}
