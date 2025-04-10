import { Injectable } from '@nestjs/common';
import * as Parser from 'rss-parser';
import { RSS } from 'src/enum/enum';

@Injectable()
export class RssService {
  private readonly parser = new Parser();

  async parse36KrFeed() {
    const feed = await this.parser.parseURL(RSS._36KR);
    return feed.items.map((item) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      // content: item.content,
    }));
  }
}
