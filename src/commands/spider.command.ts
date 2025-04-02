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
    await this.sipderService.crwal_36kr();
  }

  @Command({
    command: 'crwal:36kr_detail',
  })
  async detail_36kr() {
    const url = 'https://36kr.com/p/3232928560070281';
    const resp = await this.sipderService.detail_36kr(url);
    console.log(resp);
  }
}
