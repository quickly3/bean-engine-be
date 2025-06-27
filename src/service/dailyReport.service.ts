import { Injectable } from '@nestjs/common';
import * as _ from 'lodash';
import * as moment from 'moment';
import { FeishuRobot } from './feishu/feishuRobot';
import { SearchService } from './search.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DailyReportService {
  feishu: FeishuRobot;
  constructor(
    private readonly searchService: SearchService,
    private readonly configService: ConfigService,
  ) {
    this.feishu = new FeishuRobot(this.configService);
  }

  async sendToFs(toGroup = 'bean') {
    const resp = await this.searchService.dailyMd();

    const channels = resp.data;

    const krData = _.filter(channels, (c) => c.title === '36氪新闻');
    const taiData = _.filter(channels, (c) => c.title === '钛媒体');
    const otherData = _.filter(
      channels,
      (c) => c.title !== '36氪新闻' && c.title !== '钛媒体',
    );

    const otherDataContent = this.toFeishuFormat(otherData);
    const krDataContent = this.toFeishuFormat(krData);
    const taiDataContent = this.toFeishuFormat(taiData);

    await this.feishu.set_app_access_token();

    if (toGroup === 'bean') {
      await this.feishu.sendToBeanPost(otherDataContent);
      await this.feishu.sendToBeanPost(taiDataContent);
      await this.feishu.sendToBeanPost(krDataContent);
    }

    if (toGroup === 'company') {
      await this.feishu.sendToCompanyPost(otherDataContent);
      await this.feishu.sendToCompanyPost(taiDataContent);
      await this.feishu.sendToCompanyPost(krDataContent);
    }
  }

  toFeishuFormat(channels) {
    const content: any = [];
    for (const channel of channels) {
      const { title, data } = channel;
      if (data.length === 0) {
        continue;
      }
      content.push([{ tag: 'text', text: title }]);

      for (const i in data) {
        const a = data[i];
        content.push([
          { tag: 'a', href: a.url, text: `${parseInt(i) + 1}.${a.title}` },
        ]);
      }
    }
    const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
    const postContent = {
      zh_cn: {
        title: `互联网资讯（${yesterday}）`,
        content,
      },
    };
    return postContent;
  }
}
