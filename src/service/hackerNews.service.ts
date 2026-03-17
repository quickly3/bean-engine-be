import { Injectable } from '@nestjs/common';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import moment from 'moment';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { SystemMessage } from '@langchain/core/messages';
import { ChatDeepSeek } from '@langchain/deepseek';
import { CAT_TITLES_PROMPT } from 'src/prompts/cat-titles.prompt';
import { TRANSLATE_TITLES_PROMPT } from 'src/prompts/translate-titles.prompt';
import { AI_DAILY_REPORT_PROMPT } from 'src/prompts/ai-daily-report.prompt';
import { REFINE_SUBCATEGORIES_PROMPT } from 'src/prompts/refine-subcategories.prompt';
import { HACKNEWS_CATEGORY } from 'src/enum/enum';
import { GEN_SUBCATEGORIES_PROMPT } from 'src/prompts/gen-subcategories.prompt';

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

  async genSubCategories() {
    // const categories = Object.values(HACKNEWS_CATEGORY);
    const categories = [HACKNEWS_CATEGORY.TOOLS_SCRIPT_CLI];
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
          `  第 ${pageIndex} 页，共 ${records.length} 条，正在调用 DeepSeek 分析...`,
        );

        const titles = records.map((r) => r.title_cn);
        const prompt =
          GEN_SUBCATEGORIES_PROMPT.replace('{{category}}', category) +
          JSON.stringify(titles);

        const messages = [new SystemMessage(prompt)];
        const model = new ChatDeepSeek({
          apiKey: this.configService.get('deepseek.DS_KEY'),
          model: 'deepseek-chat',
        });

        try {
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

    const model = new ChatDeepSeek({
      apiKey: this.configService.get('deepseek.DS_KEY'),
      model: 'deepseek-chat',
    });

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
        const resp = await model.invoke([new SystemMessage(prompt)]);

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
