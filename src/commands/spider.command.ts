import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { SipderService } from 'src/service/spider/spider.service';

@Injectable()
export class SpiderCommand {
  constructor(private readonly sipderService: SipderService) {}

  @Command({
    command: 'crwal:36kr',
  })
  async crwal_36kr() {
    await this.sipderService.crwal_36kr({ exportToCsv: true });
  }

  @Command({
    command: 'crwal:36kr_detail',
  })
  async detail_36kr() {
    const url = 'https://36kr.com/p/3232928560070281';
    const resp = await this.sipderService.detail_36kr(url);
    console.log(resp);
  }

  @Command({
    command: 'crwal:36kr_batch',
  })
  async crawlBatch36kr() {
    const resp = await this.sipderService.crawlBatch36kr();
    console.log(resp);
  }

  @Command({
    command: 'crwal:today_report',
  })
  async genTodayReport() {
    const resp = await this.sipderService.genTodayReport();
    console.log(resp);
  }

  @Command({
    command: 'crwal:parseByAi',
  })
  async parseByAi() {
    const content = '黄鹤楼是什么？回答100字以内';
    const resp = await this.sipderService.parseByAi(content);
    console.log(resp);
  }

  @Command({
    command: 'crwal:oc_list_oc',
  })
  async list_oc() {
    const url = 'https://www.oschina.net/project/lang/467/kotlin';
    const resp = await this.sipderService.list_oc(url);
  }
}
