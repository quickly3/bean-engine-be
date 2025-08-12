import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { SpiderService } from 'src/service/spider/spider.service';
import { RssService } from 'src/service/rss/rss.service';

@Injectable()
export class SpiderCommand {
  constructor(
    private readonly spiderService: SpiderService,
    private readonly rssService: RssService,
  ) {}

  @Command({
    command: 'crwal:36kr',
  })
  async crwal_36kr() {
    await this.spiderService.crwal_36kr({ exportToCsv: true });
  }

  @Command({
    command: 'crwal:36kr_detail',
  })
  async detail_36kr() {
    const url = 'https://36kr.com/p/3232928560070281';
    const resp = await this.spiderService.detail_36kr(url);
    console.log(resp);
  }

  @Command({
    command: 'crwal:36kr_batch',
  })
  async crawlBatch36kr() {
    const resp = await this.spiderService.crawlBatch36kr();
    console.log(resp);
  }

  @Command({
    command: 'crwal:today_report',
  })
  async genTodayReport() {
    const resp = await this.spiderService.genTodayReport();
    console.log(resp);
  }

  @Command({
    command: 'week_report',
  })
  async genWeekReport() {
    const resp = await this.spiderService.genWeekReport();
    console.log(resp);
  }

  @Command({
    command: 'crwal:parseByAi',
  })
  async parseByAi() {
    const content = '黄鹤楼是什么？回答100字以内';
    const resp = await this.spiderService.parseByAi(content);
    console.log(resp);
  }

  @Command({
    command: 'crwal:oc_list_oc',
  })
  async list_oc() {
    const url = 'https://www.oschina.net/project/lang/467/kotlin';
    const resp = await this.spiderService.list_oc(url);
  }

  @Command({
    command: 'crawl:csdn',
  })
  async crawlCsdn() {
    const resp = await this.spiderService.crawlCsdn();
    console.log('CSDN抓取完成:', resp);
  }

  @Command({
    command: 'rss:resource',
  })
  async getRssResource() {
    await this.rssService.parseOpml();
  }

  @Command({
    command: 'crawl:guan',
  })
  async crawlGuan() {
    await this.spiderService.crawGuanUserArticles();
  }
}
