import { Injectable } from '@nestjs/common';
import * as _ from 'lodash';
import axios from 'axios';
import moment from 'moment';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { SystemMessage } from '@langchain/core/messages';
import { ChatDeepSeek } from '@langchain/deepseek';
import { CAT_TITLES_PROMPT } from 'src/prompts/cat-titles.prompt';
import { TRANSLATE_TITLES_PROMPT } from 'src/prompts/translate-titles.prompt';
import { AI_DAILY_REPORT_PROMPT } from 'src/prompts/ai-daily-report.prompt';
import { HACKNEWS_CATEGORY } from 'src/enum/enum';

export enum recordStatus {
  PENDING = 'pending',
  TRANSLATED = 'translated',
  TRANSLATED_FAILED = 'translated_failed',
  CATEGORIZED = 'categorized',
  CATEGORIZED_FAILED = 'categorized_failed',
}

@Injectable()
export class HackerNewsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
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

    const records = await this.prisma.hackNews.findMany({
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

    await this.prisma.hackNews.createMany({
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
    const allRecords = await this.prisma.hackNews.findMany({
      where,
      orderBy: {
        id: 'desc',
      },
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

        let titles_cn = '';
        try {
          titles_cn = await this.gptTrans(titles);
        } catch (error) {
          console.error('Error translating records:', error);
          await this.prisma.hackNews.updateMany({
            where: {
              id: { in: ids },
            },
            data: {
              state: recordStatus.TRANSLATED,
            },
          });
          return ids.map((id) => ({
            id,
            title_cn: null,
            state: recordStatus.TRANSLATED_FAILED,
          }));
        }

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
            await this.prisma.hackNews.update({
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

    const allRecords = await this.prisma.hackNews.findMany({
      where,
      orderBy: {
        id: 'desc',
      },
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

        let cates = '';
        try {
          cates = await this.aiCate(titles_cn);
        } catch (error) {
          console.error('Error categorizing records:', error);
          await this.prisma.hackNews.updateMany({
            where: {
              id: { in: ids },
            },
            data: {
              state: recordStatus.CATEGORIZED_FAILED,
            },
          });
          return ids.map((id) => ({
            id,
            category: null,
            state: recordStatus.CATEGORIZED_FAILED,
            level: null,
          }));
        }
        // const cates = await this.aiCate(titles_cn);

        const resultArray = Array.isArray(cates) ? cates : [cates];
        return resultArray.map((d: string, i: number) => {
          return {
            id: ids[i],
            level: cates[i][0],
            category: cates[i][1],
            state: recordStatus.CATEGORIZED,
          };
        });
      });
      const results = await Promise.allSettled(promises);

      for (const res of results) {
        if (res.status === 'fulfilled') {
          const recordsToUpdate = res.value;
          for (const record of recordsToUpdate) {
            await this.prisma.hackNews.update({
              where: {
                id: record.id,
              },
              data: {
                category: record.category,
                state: record.state,
                level: record.level,
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

  async getAiNewsByDate(date?: string) {
    const targetDate = date
      ? moment(date, 'YYYY-MM-DD')
      : moment().startOf('day');

    const news = await this.prisma.hackNews.findMany({
      where: {
        createdAt: {
          gte: targetDate.startOf('day').toDate(),
          lte: targetDate.endOf('day').toDate(),
        },
        category: HACKNEWS_CATEGORY.AI_APPLICATION,
        title_cn: { not: null },
        url: { not: null },
      },
      orderBy: { score: 'desc' },
      take: 50,
    });

    return news;
  }

  async generateAiDailyReport(date?: string) {
    const news = await this.getAiNewsByDate(date);

    if (news.length === 0) {
      return {
        date: date || moment().format('YYYY-MM-DD'),
        total: 0,
        summary: '当天暂无 AI 相关新闻',
        categories: [],
        highlights: [],
        news: [],
      };
    }

    const input = news.map((n) => ({ title_cn: n.title_cn, url: n.url }));
    const prompt = `${AI_DAILY_REPORT_PROMPT}${JSON.stringify(input)}`;
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

    // Strip markdown code fences if present
    const cleaned = respContent
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
    const report = JSON.parse(cleaned);

    return {
      date: date || moment().format('YYYY-MM-DD'),
      total: news.length,
      ...report,
      news,
    };
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

  async getHackNewsContent(category) {
    const news = await this.prisma.hackNews.findMany({
      where: {
        createdAt: {
          gte: moment().subtract(1, 'day').startOf('day').toDate(),
        },
        category,
        level: {
          in: [4, 5],
        },
        url: {
          not: null,
        },
        subTitle: null,
      },
      take: 50,
    });

    const content = this.hackNewsToFeishuFormat([
      {
        title: category,
        data: news,
      },
    ]);
    return content;
  }

  async getHackNewsContentDaily(category) {
    const news = await this.prisma.hackNews.findMany({
      select: {
        title_cn: true,
        url: true,
      },
      where: {
        createdAt: {
          gte: moment().subtract(1, 'day').startOf('day').toDate(),
        },
        category,
        url: {
          not: null,
        },
        subTitle: null,
      },
      take: 50,
      orderBy: { level: 'desc' },
    });

    news.map((n: any) => {
      n.title = n.title_cn;
      delete n.title_cn;
    });
    return news;
  }

  hackNewsToFeishuFormat(channels) {
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
          { tag: 'a', href: a.url, text: `${parseInt(i) + 1}.${a.title_cn}` },
        ]);
      }
    }
    const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
    const postContent = {
      zh_cn: {
        title: `Hack news for developers（${yesterday}）`,
        content,
      },
    };
    return postContent;
  }
}
