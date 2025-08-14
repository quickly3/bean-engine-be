import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { XMLParser } from 'fast-xml-parser';
import { saveJsonFileToCsv } from 'src/utils/file';
import { parseRSS } from '../ai/rss';
import * as _ from 'lodash';
import * as moment from 'moment';
import { ArticleService } from '../article.service';

@Injectable()
export class RssService {
  constructor(private readonly articleService: ArticleService) {
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

      // if (outline.title !== 'BBC / Health') {
      //   continue;
      // }

      // if (
      //   outline.url &&
      //   outline.url.indexOf('https://plink.anyfeeder.com') > -1
      // ) {
      //   continue;
      // }

      const feeds = await this.rssParse(outline.url, useProxy);
      console.log(outline.title, `获取到 ${feeds.length} 条数据`);
      // save to csv

      if (feeds.length > 0) {
        const _title = outline.title.replace('/', '-');

        const formattedFeeds = feeds.map((feed) => ({
          title: feed.title,
          summary: feed.description || '',
          url: feed.link || '',
          source: 'rss',
          author: outline.title || '',
          created_at: moment(feed.pubDate).format('YYYY-MM-DD'),
        }));

        await this.articleService.bulkInsert(formattedFeeds);

        saveJsonFileToCsv(
          `output/rss/${outline.type}/${_title}.csv`,
          feeds.map((f) => {
            delete f.description;
            return f;
          }),
        );
      }
      // if (outline.title === 'Daring Fireball') {
      //   break;
      // }

      // if (outline.title === 'BBC / Health') {
      //   break;
      // }
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
