import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { RssService } from '../service/rss.service';

@Injectable()
export class RssCommand {
  constructor(private readonly rssService: RssService) {}

  @Command({
    command: 'rss:36kr',
  })
  async rss_36kr() {
    const rss = await this.rssService.parse36KrFeed();
    console.log('🚀 ~ RssCommand ~ rss_36kr ~ rss:', rss);
  }
}
