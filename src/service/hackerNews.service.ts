import { Injectable } from '@nestjs/common';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import moment from 'moment';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { CAT_TITLES_PROMPT } from 'src/prompts/cat-titles.prompt';
import { TRANSLATE_TITLES_PROMPT } from 'src/prompts/translate-titles.prompt';
import { AI_DAILY_REPORT_PROMPT } from 'src/prompts/ai-daily-report.prompt';
import { AI_DAILY_REPORT_MD_PROMPT } from 'src/prompts/ai-daily-report-md.prompt';
import { AI_NEWS_DAILY_PROMPT } from 'src/prompts/ai-news-daily.prompt';
import { HACKNEWS_DAILY_REPORT_PROMPT } from 'src/prompts/hacknews-daily-report.prompt';
import { REFINE_SUBCATEGORIES_PROMPT } from 'src/prompts/refine-subcategories.prompt';
import { HACKNEWS_CATEGORY } from 'src/enum/enum';
import { GEN_SUBCATEGORIES_PROMPT } from 'src/prompts/gen-subcategories.prompt';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { DeepSeekService } from './ai/deepseek.service';
import { FeishuRobot } from './feishu/feishuRobot';
import { ArkAiService } from './ai/arkAi.service';

export enum recordStatus {
  PENDING = 'pending',
  TRANSLATED = 'translated',
  TRANSLATED_FAILED = 'translated_failed',
  CATEGORIZED = 'categorized',
  CATEGORIZED_FAILED = 'categorized_failed',
}

@Injectable()
export class HackerNewsService {
  llmType = 'deepseek'; // 'deepseek' | 'minimax' - 可通过配置或环境变量动态设置
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly deepSeekService: DeepSeekService,
    private readonly arkAiService: ArkAiService,
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
      const _records: any = _.chunk(records, 20);

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
      const _records: any = _.chunk(records, 20);

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

  private async callLLM(prompt: string) {
    switch (this.llmType) {
      case 'glm':
        return this.callGLM(prompt);
      case 'deepseek':
        return this.callDeepSeek(prompt);
      case 'minimax':
        return this.callMinimax(prompt);
      case 'minimax-openai':
        return this.callMinimaxOpenAi(prompt);
      default:
        throw new Error(`Unsupported LLM type: ${this.llmType}`);
    }
  }

  private async callGLM(prompt: string): Promise<string> {
    const resp = await this.arkAiService.chatWithSystem({
      system: '',
      message: prompt,
      type: 'glm',
    });

    if (typeof resp === 'string') {
      return resp;
    }
    return '';
  }

  private async callDeepSeek(prompt: string): Promise<string> {
    // const model = new ChatDeepSeek({
    //   apiKey: this.configService.get('deepseek.DS_KEY'),
    //   model: 'deepseek-v4-flash',
    // });
    // const resp = await model.invoke([new SystemMessage(prompt)]);

    const resp = await this.deepSeekService.chatWithSystem({
      system: '',
      message: prompt,
      type: 'flash',
    });

    if (typeof resp === 'string') {
      return resp;
    }
    return '';
  }

  private async callMinimax(prompt: string): Promise<string> {
    if (!prompt || !prompt.trim()) {
      throw new Error('MiniMax 请求内容为空，已跳过本页');
    }

    const minimaxApiKey = this.configService.get<string>('minimax.apiKey');
    const minimaxModel = this.configService.get<string>('minimax.model');
    const minimaxBaseURL = this.configService.get<string>('minimax.apiUrl');

    const minimaxClient = new Anthropic({
      apiKey: minimaxApiKey,
      baseURL: minimaxBaseURL,
    });

    const resp = await minimaxClient.messages.create({
      model: minimaxModel,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
      thinking: {
        type: 'disabled',
      },
    });

    const messageContent = resp.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!messageContent) {
      throw new Error('MiniMax 返回为空');
    }

    return messageContent;
  }

  private async callMinimaxOpenAi(prompt: string): Promise<string> {
    if (!prompt || !prompt.trim()) {
      throw new Error('MiniMax 请求内容为空，已跳过本页');
    }

    const minimaxApiKey = this.configService.get<string>('minimax.apiKey');
    const minimaxModel = this.configService.get<string>('minimax.model');
    const minimaxBaseURL = this.configService.get<string>('minimax.baseApiUrl');

    if (!minimaxApiKey || !minimaxModel || !minimaxBaseURL) {
      throw new Error(
        'MiniMax 配置不完整，请检查 minimax.apiKey/model/baseApiUrl',
      );
    }

    const client = new OpenAI({
      apiKey: minimaxApiKey,
      baseURL: minimaxBaseURL,
    });

    const completion = await client.chat.completions.create({
      model: minimaxModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
    });

    const content: any = completion.choices?.[0]?.message?.content;

    console.log(content);
    const messageContent =
      typeof content === 'string'
        ? content.trim()
        : Array.isArray(content)
          ? content
              .map((part: any) =>
                typeof part?.text === 'string' ? part.text : '',
              )
              .join('\n')
              .trim()
          : '';

    if (!messageContent) {
      throw new Error('MiniMax 返回为空');
    }

    return messageContent;
  }

  async gptTrans(titles) {
    console.log(
      moment().format('YYYY-MM-DD HH:mm:ss'),
      'Translating titles via DeepSeek',
    );
    const titles_string = JSON.stringify(titles);
    const prompt = `${TRANSLATE_TITLES_PROMPT}\n${titles_string}`;
    const respContent = await this.callLLM(prompt);
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
    const respContent = await this.callLLM(prompt);
    const titles_cn = JSON.parse(respContent);
    return titles_cn;
  }

  async getAiNewsByDate(
    date?: string,
    category = HACKNEWS_CATEGORY.AI_APPLICATION,
    take = 50,
  ) {
    const targetDate = date
      ? moment(date, 'YYYY-MM-DD')
      : moment().startOf('day');

    const news = await this.prisma.hackNews.findMany({
      select: {
        title_cn: true,
        title: true,
        category: true,
        level: true,
        url: true,
      },
      where: {
        createdAt: {
          gte: targetDate.startOf('day').toDate(),
          lte: targetDate.endOf('day').toDate(),
        },
        ...(category && { category }),
        title_cn: { not: null },
        url: { not: null },
      },
      orderBy: { score: 'desc' },
      ...(take && { take }),
    });
    console.log(
      moment().format('YYYY-MM-DD HH:mm:ss'),
      `Fetched ${news.length} AI news for date: ${targetDate.format(
        'YYYY-MM-DD',
      )}`,
    );

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
    const respContent = await this.callLLM(prompt);

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

  /**
   * 生成 Markdown 格式的 AI 每日报告，并写入 output 目录
   * @param date 报告日期，不传则使用当天
   * @returns 包含文件路径和报告内容的对象
   */
  async generateAiDailyReportMd(date?: string) {
    const targetDate = date || moment().format('YYYY-MM-DD');

    const news = await this.getAiNewsByDate(targetDate);

    if (news.length === 0) {
      const emptyContent = `# AI 日报 · ${targetDate}\n\n> 面向全栈开发者的每日 AI 技术情报\n\n## 📌 今日概览\n\n当天暂无 AI 相关新闻\n`;
      const filePath = await this.writeDailyReportMd(targetDate, emptyContent);
      return { date: targetDate, total: 0, filePath, content: emptyContent };
    }

    const input = news.map((n) => ({ title_cn: n.title_cn, url: n.url }));
    const prompt = `${AI_DAILY_REPORT_MD_PROMPT}${JSON.stringify(input)}`;
    const respContent = await this.callLLM(prompt);

    // 替换日期占位符
    const content = respContent
      .replace(/^```(?:markdown)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim()
      .replace('{{date}}', targetDate);

    const filePath = await this.writeDailyReportMd(targetDate, content);

    return {
      date: targetDate,
      total: news.length,
      filePath,
      content,
    };
  }

  /**
   * 生成 Markdown 格式的 AI 摸鱼日报，并写入 output 目录
   * @param date 报告日期，不传则使用当天
   * @returns 包含文件路径和报告内容的对象
   */
  async generateNewsDailyReportMd(date?: string) {
    const targetDate = date || moment().subtract(1, 'day').format('YYYY-MM-DD');
    // 报告标题使用次日日期：今天生成的是对昨天新闻的总结，呈现为"明日期"的日报
    const reportDate = moment(targetDate, 'YYYY-MM-DD')
      .add(1, 'day')
      .format('YYYY-MM-DD');

    // category=null 表示查询全部分类，take=null 表示不限制条数
    const news = await this.getAiNewsByDate(targetDate, null, null);

    if (news.length === 0) {
      const emptyContent = `# 🐟 每日摸鱼新闻 · ${reportDate}\n\n> 打工人的互联网摸鱼指南 · 带薪看报，快乐摸鱼\n\n## 🔥 今日摸鱼速报\n\n今天没新闻可摸鱼，早点下班吧\n`;
      const filePath = await this.writeNewsDailyReportMd(
        reportDate,
        emptyContent,
      );
      return {
        date: targetDate,
        reportDate,
        total: 0,
        filePath,
        content: emptyContent,
      };
    }

    // prompt 输入中不传 url，只传 id 以减少 token；生成后再还原链接
    const input = news.map((n, i) => ({
      id: i + 1,
      title_cn: n.title_cn,
      title: n.title,
      category: n.category,
      level: n.level,
    }));
    const idUrlMap = new Map(input.map((n) => [n.id, news[n.id - 1].url]));
    const csvData = this.newsToCsv(input);
    // prompt 中提示：本日报是对昨日（targetDate）新闻的总结，但以今日（reportDate）视角发布
    const prompt = `${AI_NEWS_DAILY_PROMPT}\n\n【重要提示】\n本日报是对昨天（${targetDate}）发生的新闻的总结回顾。报告标题日期使用今日日期（${reportDate}），即"回顾昨日、发布今日"的模式。撰写时可以适当使用"昨天"、"昨日"等表述来描述事件发生时间，让读者明确这是对前一天动态的梳理。\n\n以下是昨天（${targetDate}）的新闻数据（CSV 格式）：\n${csvData}`;
    const respContent = await this.callLLM(prompt);
    // const respContent = await this.callGLM(prompt);

    // 替换日期占位符（使用次日日期作为报告标题日期）
    const content = respContent
      .replace(/^```(?:markdown)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim()
      .replace('{{date}}', reportDate);

    const restoredContent = this.restoreUrlById(content, idUrlMap);

    const filePath = await this.writeNewsDailyReportMd(
      reportDate,
      restoredContent,
    );
    const feishu = new FeishuRobot(this.configService);
    await feishu.set_app_access_token();

    const sfContent = feishu.toFeishuMdFormat(
      `每日摸鱼新闻 · ${reportDate}`,
      restoredContent,
    );

    await feishu.sendToBeanPost(sfContent);

    return {
      date: targetDate,
      reportDate,
      total: news.length,
      filePath,
      content: restoredContent,
    };
  }

  /**
   * 将新闻数据转为 CSV 格式，用于减小 prompt 体积
   *
   * 相比 JSON，省去了每条记录重复的字段名和引号开销，
   * 当新闻条数较多时显著缩减 prompt 长度。
   *
   * @param news 原始新闻数组
   * @returns CSV 格式字符串
   */
  private newsToCsv(
    news: Array<{
      id: number;
      title_cn: string;
      title: string;
      category: string;
      level: number;
    }>,
  ): string {
    const header = 'id,title_cn,title,category,level';
    const rows = news.map((n) => {
      // CSV 转义：字段中的逗号、双引号、换行需要用双引号包裹并转义
      const escapeCsv = (val: string | number) => {
        const s = String(val ?? '');
        if (/[",\n\r]/.test(s)) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };
      return [
        escapeCsv(n.id),
        escapeCsv(n.title_cn),
        escapeCsv(n.title),
        escapeCsv(n.category),
        escapeCsv(n.level),
      ].join(',');
    });
    return [header, ...rows].join('\n');
  }

  /**
   * 将 AI 输出中的链接 ID 占位符替换为真实 URL。
   * 例如：[标题](ID:12) -> [标题](https://example.com)
   */
  private restoreUrlById(
    content: string,
    idUrlMap: Map<number, string>,
  ): string {
    return content.replace(/\((?:id|ID)\s*[:：]\s*(\d+)\)/g, (raw, idText) => {
      const id = Number(idText);
      const url = idUrlMap.get(id);
      return url ? `(${url})` : raw;
    });
  }

  /**
   * 生成 Markdown 格式的 HackNews 技术日报，并写入 output 目录
   * 与摸鱼日报不同，本报告突出 HackNews 的专业性，不含娱乐化表达
   * @param date 报告日期，不传则使用昨天的日期
   * @returns 包含文件路径和报告内容的对象
   */
  async generateHackNewsDailyReportMd(date?: string) {
    const targetDate = date || moment().subtract(1, 'day').format('YYYY-MM-DD');
    // 报告标题使用次日日期：今天生成的是对昨天新闻的总结，呈现为"明日期"的日报
    const reportDate = moment(targetDate, 'YYYY-MM-DD')
      .add(1, 'day')
      .format('YYYY-MM-DD');

    // category=null 表示查询全部分类，take=null 表示不限制条数
    const news = await this.getAiNewsByDate(targetDate, null, null);

    if (news.length === 0) {
      const emptyContent = `# 📰 HackNews 技术日报 · ${reportDate}\n\n> 每日 HackerNews 热门精选 · 为开发者筛选值得关注的动态\n\n## 🔥 今日速报\n\n今天暂无新闻内容\n`;
      const filePath = await this.writeHackNewsDailyReportMd(
        reportDate,
        emptyContent,
      );
      return {
        date: targetDate,
        reportDate,
        total: 0,
        filePath,
        content: emptyContent,
      };
    }

    // prompt 输入中不传 url，只传 id 以减少 token；生成后再还原链接
    const input = news.map((n, i) => ({
      id: i + 1,
      title_cn: n.title_cn,
      title: n.title,
      category: n.category,
      level: n.level,
    }));
    const idUrlMap = new Map(input.map((n) => [n.id, news[n.id - 1].url]));
    // 转为 CSV 格式以减小 prompt 体积
    const csvData = this.newsToCsv(input);
    // prompt 中提示：本日报是对昨日（targetDate）新闻的总结，但以今日（reportDate）视角发布
    const prompt = `${HACKNEWS_DAILY_REPORT_PROMPT}\n\n【重要提示】\n本日报是对昨天（${targetDate}）发生的新闻的总结回顾。报告标题日期使用今日日期（${reportDate}），即"回顾昨日、发布今日"的模式。撰写时可以适当使用"昨天"、"昨日"等表述来描述事件发生时间，让读者明确这是对前一天动态的梳理。\n\n以下是昨天（${targetDate}）的新闻数据（CSV 格式）：\n${csvData}`;

    // const respContent = await this.callGLM(prompt);

    const respContent = await this.callDeepSeek(prompt);

    // 替换日期占位符（使用次日日期作为报告标题日期）
    const content = respContent
      .replace(/^```(?:markdown)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim()
      .replace('{{date}}', reportDate);

    const restoredContent = this.restoreUrlById(content, idUrlMap);

    const filePath = await this.writeHackNewsDailyReportMd(
      reportDate,
      restoredContent,
    );

    const feishu = new FeishuRobot(this.configService);
    await feishu.set_app_access_token();

    const sfContent = feishu.toFeishuMdFormat(
      `HackNews 技术日报 · ${reportDate}`,
      restoredContent,
    );

    await feishu.sendToBeanPost(sfContent);

    return {
      date: targetDate,
      reportDate,
      total: news.length,
      filePath,
      content: restoredContent,
    };
  }

  /**
   * 将 HackNews 技术日报写入 output/ai_daily_reports/ 目录
   * 文件名使用 hacknews-daily-report 前缀，与其他报告区分
   */
  private async writeHackNewsDailyReportMd(
    date: string,
    content: string,
  ): Promise<string> {
    const dir = path.join(process.cwd(), 'output', 'ai_daily_reports');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `hacknews-daily-report-${date}.md`);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`HackNews 技术日报已写入: ${filePath}`);
    return filePath;
  }

  /**
   * 将全量新闻 Markdown 报告写入 output/ai_daily_reports/ 目录
   * 文件名使用 news-daily-report 前缀，与 AI 专用报告区分
   */
  private async writeNewsDailyReportMd(
    date: string,
    content: string,
  ): Promise<string> {
    const dir = path.join(process.cwd(), 'output', 'ai_daily_reports');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `news-daily-report-${date}.md`);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`每日摸鱼新闻已写入: ${filePath}`);
    return filePath;
  }

  /**
   * 将 Markdown 报告写入 output/ai_daily_reports/ 目录
   */
  private async writeDailyReportMd(
    date: string,
    content: string,
  ): Promise<string> {
    const dir = path.join(process.cwd(), 'output', 'ai_daily_reports');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `ai-daily-report-${date}.md`);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`AI 日报已写入: ${filePath}`);
    return filePath;
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

  async genSubCategories() {
    // const categories = Object.values(HACKNEWS_CATEGORY);
    const categories = [HACKNEWS_CATEGORY.AI_APPLICATION];
    const PAGE_SIZE = 1000;

    const outputDir = path.join(
      process.cwd(),
      'output',
      'hacknews_subcategories',
    );

    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`结果将写入目录: ${outputDir}`);

    const jumpCate = [];

    for (const category of categories) {
      if (jumpCate.includes(category)) {
        console.log(`跳过分类: ${category}`);
        continue;
      }
      console.log(`\n正在处理分类: ${category}`);

      const safeFileName = category.replace(/[\\/\s]/g, '_') + '.jsonl';
      const outputFile = path.join(outputDir, safeFileName);

      let skip = 0;
      let pageIndex = 1;
      let hasMore = true;

      const count = await this.prisma.hackNews.count({
        where: {
          category,
          title_cn: { not: null },
        },
      });
      console.log(`  分类 [${category}] 共 ${count} 条记录`);

      let processedCount = 0;
      while (hasMore) {
        // if (pageIndex === 2) {
        //   break; // 测试时只处理前两页
        // }
        const records = await this.prisma.hackNews.findMany({
          select: { title_cn: true },
          where: {
            category,
            title_cn: { not: null },
          },
          orderBy: { id: 'desc' },
          skip,
          take: PAGE_SIZE,
        });
        console.log(
          `  已处理 ${processedCount} 条，当前页 ${pageIndex}，本页 ${records.length} 条`,
        );
        processedCount += records.length;
        if (records.length === 0) {
          if (pageIndex === 1) {
            console.log(`  分类 [${category}] 暂无数据，跳过`);
          }
          hasMore = false;
          break;
        }

        console.log(
          `  第 ${pageIndex} 页，共 ${records.length} 条，正在调用 ${this.llmType} 分析...`,
        );

        const titles = records.map((r) => r.title_cn);
        const prompt =
          GEN_SUBCATEGORIES_PROMPT.replace('{{category}}', category) +
          JSON.stringify(titles);

        try {
          const respContent = await this.callLLM(prompt);

          const cleaned = respContent
            .replace(/^```(?:json)?\n?/, '')
            .replace(/\n?```$/, '')
            .trim();

          const subCates = JSON.parse(cleaned);

          subCates.page = pageIndex;

          console.log(
            `  分析完成，归纳出 ${subCates.sub_categories?.length ?? 0} 个子分类：`,
          );
          for (const sc of subCates.sub_categories ?? []) {
            console.log(`    - ${sc.name}：${sc.description}`);
          }

          fs.appendFileSync(
            outputFile,
            JSON.stringify(subCates) + '\n',
            'utf-8',
          );
          console.log(`  已追加写入文件（第 ${pageIndex} 页）`);
        } catch (error) {
          console.error(
            `  分类 [${category}] 第 ${pageIndex} 页分析失败:`,
            error.message,
          );
          const errorEntry = {
            category,
            page: pageIndex,
            error: error.message,
          };
          fs.appendFileSync(
            outputFile,
            JSON.stringify(errorEntry) + '\n',
            'utf-8',
          );
        }

        hasMore = records.length === PAGE_SIZE;
        skip += PAGE_SIZE;
        pageIndex++;
      }
    }

    console.log(
      `\n\n========== 全部分类处理完成，结果已写入 ${outputDir} ==========`,
    );
  }

  async refineSubCategories(minTargetCount = 5, maxTargetCount = 8) {
    const inputDir = path.join(
      process.cwd(),
      'output',
      'hacknews_subcategories',
    );
    const outputDir = path.join(
      process.cwd(),
      'output',
      'hacknews_subcategories_refined',
    );
    fs.mkdirSync(outputDir, { recursive: true });

    const files = fs.readdirSync(inputDir).filter((f) => f.endsWith('.jsonl'));

    console.log(
      `共发现 ${files.length} 个分类文件，子分类数量范围：${minTargetCount}～${maxTargetCount}\n`,
    );

    for (const file of files) {
      // 从文件名还原大分类名称（___→ /，_ → 空格）
      const category = file
        .replace(/\.jsonl$/, '')
        .replace(/___/g, ' / ')
        .replace(/_/g, ' ');

      console.log(`正在精炼分类：${category}`);

      const filePath = path.join(inputDir, file);
      const lines = fs
        .readFileSync(filePath, 'utf-8')
        .split('\n')
        .filter((l) => l.trim());

      // 收集所有子分类（含重复）
      const allSubCates: string[] = [];
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (Array.isArray(parsed)) {
            allSubCates.push(...parsed.filter((s) => typeof s === 'string'));
          }
        } catch {
          // 跳过解析失败的行
        }
      }

      if (allSubCates.length === 0) {
        console.log(`  [${category}] 无有效子分类，跳过\n`);
        continue;
      }

      console.log(`  原始子分类共 ${allSubCates.length} 条（含重复）`);

      const prompt =
        REFINE_SUBCATEGORIES_PROMPT.replace(/{{category}}/g, category)
          .replace(/{{minTargetCount}}/g, String(minTargetCount))
          .replace(/{{maxTargetCount}}/g, String(maxTargetCount)) +
        JSON.stringify(allSubCates);

      try {
        const respContent = await this.callLLM(prompt);

        const cleaned = respContent
          .replace(/^```(?:json)?\n?/, '')
          .replace(/\n?```$/, '')
          .trim();

        const refined: string[] = JSON.parse(cleaned);
        console.log(
          `  精炼后子分类（${refined.length} 个）：${refined.join('、')}`,
        );

        const outFile = path.join(outputDir, file.replace(/\.jsonl$/, '.json'));
        fs.writeFileSync(
          outFile,
          JSON.stringify({ category, subCategories: refined }, null, 2),
          'utf-8',
        );
        console.log(`  已写入：${outFile}\n`);
      } catch (error) {
        console.error(`  [${category}] 精炼失败：${error.message}\n`);
      }
    }

    console.log(`\n========== 精炼完成，结果已写入 ${outputDir} ==========`);
  }
}
