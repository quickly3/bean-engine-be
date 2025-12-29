import { Injectable } from '@nestjs/common';
import * as _ from 'lodash';
import axios from 'axios';
import moment from 'moment';
import { TRANSLATE_TITLES_PROMPT, CAT_TITLES_PROMPT } from './feishu/enum';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { SystemMessage } from '@langchain/core/messages';
import { ChatDeepSeek } from '@langchain/deepseek';

export enum recordStatus {
  PENDING = 'pending',
  TRANSLATED = 'translated',
  CATEGORIZED = 'categorized',
}

@Injectable()
export class HackerNewsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}
  headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36',
    Accept: '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    Connection: 'keep-alive',
  };

  async getItem(id) {
    try {
      const url = `https://hacker-news.firebaseio.com/v0/item/${id}.json?print=pretty`;

      const response = await axios.get(url, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      console.log(error);
    }
  }

  async getTopStories() {
    try {
      const url =
        'https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty';

      // const url = 'https://www.baidu.com';

      const response = await axios.get(url, {
        headers: this.headers,
      });

      return response.data;
    } catch (error) {
      console.error(error);
    }
  }

  async getNewStories() {
    try {
      const url =
        'https://hacker-news.firebaseio.com/v0/newstories.json?print=pretty';

      // const url = 'https://www.baidu.com';

      const response = await axios.get(url, {
        headers: this.headers,
      });

      return response.data;
    } catch (error) {
      console.log(error);
    }
  }

  async getTopStoriesParsed() {
    const ids = await this.getTopStories();

    const stories = [];
    const titles = [];
    for (const id of ids) {
      const resp = await this.getItem(id);
      const item = {
        title: resp.title,
        url: resp.url,
        time: moment(parseInt(`${resp.time}000`)).format('YYYY-MM-DD'),
      };
      titles.push(resp.title);
      stories.push(item);
    }
  }

  async getNewStories2() {
    let ids = await this.getNewStories();

    const stories = [];
    const titles = [];
    const datas = [];

    const records = await this.prismaService.hackNews.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    const existingIds = records.map((record) => record.id);

    // Filter out IDs that already exist in the database
    ids = ids.filter((id) => !existingIds.includes(id));
    const ids_chunk = _.chunk(ids, 10);

    const total = ids.length;
    let current = 0;

    for (const _ids of ids_chunk) {
      const promises = _ids.map((id) => this.getItem(id));
      const results = await Promise.allSettled(promises);

      for (let i = 0; i < results.length; i++) {
        console.log(`Processing ${++current} of ${total}`);
        const res = results[i];
        const id: any = _ids[i];

        if (res.status !== 'fulfilled' || !res.value) {
          console.log(`Failed to fetch item with ID: ${id}`);
          continue;
        }

        const resp = res.value;
        const item = {
          title: resp.title,
          url: resp.url,
          time: moment(parseInt(`${resp.time}000`)).format('YYYY-MM-DD'),
        };
        titles.push(resp.title);
        stories.push(item);
        delete resp.kids;

        const subTitilePrefixes = ['Show HN: ', 'Ask HN: '];
        for (const prefix of subTitilePrefixes) {
          if (resp.title.startsWith(prefix)) {
            resp.title = resp.title.replace(prefix, '');
            resp.subTitle = prefix.trim().replace(':', '');
            break;
          }
        }

        resp.state = recordStatus.PENDING;
        datas.push(resp);
      }
    }

    await this.prismaService.hackNews.createMany({
      data: datas,
    });
    return ids;
  }

  async transRecords(ids = []) {
    const where = {
      state: recordStatus.PENDING,
      title: {
        not: null,
      },
    };

    if (ids.length > 0) {
      where['id'] = { in: ids };
    }
    const allRecords = await this.prismaService.hackNews.findMany({
      where,
    });
    const total = allRecords.length;
    let current = 0;
    const chunkRecords = _.chunk(allRecords, 100);

    for (const records of chunkRecords) {
      current += records.length;
      console.log(`Translating records: ${current} / ${total}`);
      const _records = _.chunk(records, 20);

      const promises = _records.map(async (recs) => {
        const ids = recs.map((record) => record.id);
        const titles = recs.map((record) => record.title);
        const titles_cn = await this.gptTrans(titles);
        const resultArray = Array.isArray(titles_cn) ? titles_cn : [titles_cn];
        return resultArray.map((d: string, i: number) => {
          return {
            id: ids[i],
            title_cn: d,
            state: recordStatus.TRANSLATED,
          };
        });
      });
      const results = await Promise.allSettled(promises);

      for (const res of results) {
        if (res.status === 'fulfilled') {
          const recordsToUpdate = res.value;
          for (const record of recordsToUpdate) {
            await this.prismaService.hackNews.update({
              where: {
                id: record.id,
              },
              data: {
                title_cn: record.title_cn,
                state: record.state,
              },
            });
          }
        } else {
          console.error('Error translating records:', res.reason);
        }
      }
    }
  }

  async cateRecords(ids = []) {
    const where = {
      state: recordStatus.TRANSLATED,
      title_cn: {
        not: null,
      },
    };

    if (ids.length > 0) {
      where['id'] = { in: ids };
    }

    const allRecords = await this.prismaService.hackNews.findMany({
      where,
    });
    const total = allRecords.length;
    let current = 0;
    const chunkRecords = _.chunk(allRecords, 100);

    for (const records of chunkRecords) {
      current += records.length;
      console.log(`Cate records: ${current} / ${total}`);
      const _records = _.chunk(records, 20);

      const promises = _records.map(async (recs) => {
        const ids = recs.map((record) => record.id);
        const titles_cn = recs.map((record) => record.title_cn);
        const cates = await this.aiCate(titles_cn);
        const resultArray = Array.isArray(cates) ? cates : [cates];
        return resultArray.map((d: string, i: number) => {
          return {
            id: ids[i],
            category: cates[i],
            state: recordStatus.CATEGORIZED,
          };
        });
      });
      const results = await Promise.allSettled(promises);

      for (const res of results) {
        if (res.status === 'fulfilled') {
          const recordsToUpdate = res.value;
          for (const record of recordsToUpdate) {
            await this.prismaService.hackNews.update({
              where: {
                id: record.id,
              },
              data: {
                category: record.category,
                state: record.state,
              },
            });
          }
        } else {
          console.error('Error translating records:', res.reason);
        }
      }
    }
  }

  async gptTrans(titles) {
    console.log(
      moment().format('YYYY-MM-DD HH:mm:ss'),
      'Translating titles via DeepSeek',
    );
    const titles_string = JSON.stringify(titles);

    const prompt = `${TRANSLATE_TITLES_PROMPT}\n${titles_string}`;

    const messages = [new SystemMessage(prompt)];
    const model = new ChatDeepSeek({
      apiKey: this.configService.get('deepseek.DS_KEY'),
      model: 'deepseek-chat',
    });
    const resp = await model.invoke(messages);

    let respContent: string;
    if (typeof resp.content === 'string') {
      respContent = resp.content;
    } else if (Array.isArray(resp.content)) {
      respContent = resp.content
        .map((c: any) => (typeof c === 'string' ? c : (c.text ?? '')))
        .join('\n');
    } else {
      respContent = '';
    }

    const titles_cn = JSON.parse(respContent);
    return titles_cn;
  }

  async aiCate(titles) {
    console.log(
      moment().format('YYYY-MM-DD HH:mm:ss'),
      'Cate titles via DeepSeek',
    );
    const titles_string = JSON.stringify(titles);

    const prompt = `${CAT_TITLES_PROMPT}\n${titles_string}`;

    const messages = [new SystemMessage(prompt)];
    const model = new ChatDeepSeek({
      apiKey: this.configService.get('deepseek.DS_KEY'),
      model: 'deepseek-chat',
    });
    const resp = await model.invoke(messages);

    let respContent: string;
    if (typeof resp.content === 'string') {
      respContent = resp.content;
    } else if (Array.isArray(resp.content)) {
      respContent = resp.content
        .map((c: any) => (typeof c === 'string' ? c : (c.text ?? '')))
        .join('\n');
    } else {
      respContent = '';
    }

    const titles_cn = JSON.parse(respContent);
    return titles_cn;
  }

  async syncEs() {
    const records = [
      {
        title: 'Science Needs Neurodiversity – Science',
        url: 'https://www.science.org/doi/10.1126/science.adq0060',
        time: '2024-04-30',
        title_cn: '科学需要神经多样性 - 科学',
      },
    ];
    return records;
  }
}
