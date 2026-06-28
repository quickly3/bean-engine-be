import { Injectable } from '@nestjs/common';
import moment from 'moment';
import { PrismaService } from 'src/prisma/prisma.service';
import { LlmBaseService } from '../ai/llm-base.service';
import {
  GuanUserArticleCrawler,
  GuanArticleDetailCrawler,
} from '../spider/crawlers/guan.crawler';
import {
  GuanRawArticleItem,
  GuanCommentItem,
} from '../spider/interface/guan.interface';

/** 文章处理状态 */
export enum GuanArticleState {
  PENDING = 'pending', // 仅有列表层数据，未抓详情
  DETAILED = 'detailed', // 已抓取详情
  DETAIL_FAILED = 'detail_failed', // 详情抓取失败
  ANALYZED = 'analyzed', // 已完成 AI 分析
}

@Injectable()
export class GuanService {
  private detailCrawler = new GuanArticleDetailCrawler();

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmBaseService: LlmBaseService,
  ) {}

  /**
   * 完整爬取流程：
   * 1. 抓取用户资料层并入库
   * 2. 翻页抓取文章列表层并入库（state=pending）
   * 3. 遍历 pending 文章抓取详情层（正文/配图/评论）并入库
   * 4. 可选：对详情做 AI 分类/摘要/情绪分析
   */
  async crawlUser(
    uid: string,
    options: {
      startPage?: number;
      endPage?: number;
      withDetail?: boolean;
      withAi?: boolean;
      init?: boolean;
    } = {},
  ) {
    const {
      startPage = 1,
      endPage = 999,
      withDetail = true,
      withAi = false,
      init = false,
    } = options;

    console.log(`==> 开始爬取观察者网用户 uid=${uid}`);

    // 0. 初始化：清空该用户所有相关内容
    if (init) {
      await this.clearUserData(uid);
    }

    // 1. 用户资料层
    await this.crawlUserProfile(uid);

    // 2. 文章列表层
    const articleCount = await this.crawlUserArticleList(uid, {
      startPage,
      endPage,
    });
    console.log(`==> 列表层完成，共入库/更新 ${articleCount} 篇文章`);

    // 3. 文章详情层
    if (withDetail) {
      await this.crawlPendingArticleDetails(uid);
    }

    // 4. AI 分析
    if (withAi) {
      await this.analyzeArticles(uid);
    }

    console.log(`==> 用户 uid=${uid} 爬取流程结束`);
    return { uid, articleCount };
  }

  /**
   * 初始化：删除指定用户的所有相关内容
   * 包括：用户文章下的评论、用户文章、用户资料本身
   */
  async clearUserData(uid: string) {
    console.log(`==> 初始化：清空用户 uid=${uid} 的所有相关内容`);

    // 先取出该用户的所有文章 id，用于删除关联评论
    const articles = await this.prisma.guanArticle.findMany({
      where: { authorUid: uid },
      select: { articleId: true },
    });
    const articleIds = articles.map((a) => a.articleId);

    // 1. 删除文章关联评论
    let commentCount = 0;
    if (articleIds.length > 0) {
      const res = await this.prisma.guanComment.deleteMany({
        where: { articleId: { in: articleIds } },
      });
      commentCount = res.count;
      console.log(`  - 删除评论 ${commentCount} 条`);
    }

    // 2. 删除文章
    const { count: articleCount } = await this.prisma.guanArticle.deleteMany({
      where: { authorUid: uid },
    });
    console.log(`  - 删除文章 ${articleCount} 篇`);

    // 3. 删除用户资料
    const { count: userCount } = await this.prisma.guanUser.deleteMany({
      where: { uid },
    });
    console.log(`  - 删除用户资料 ${userCount} 条`);

    console.log(`==> 用户 uid=${uid} 数据清空完成`);
    return { articleCount, commentCount, userCount };
  }

  /** 1. 用户资料层：抓取并 upsert 用户画像 */
  async crawlUserProfile(uid: string) {
    const profile = await this.detailCrawler.crawlUserProfile(uid);
    if (!profile) {
      console.warn(`未获取到用户 ${uid} 的资料`);
      return null;
    }

    await this.prisma.guanUser.upsert({
      where: { uid: profile.uid },
      create: {
        uid: profile.uid,
        nickname: profile.nickname,
        title: profile.title,
        level: profile.level,
        avatar: profile.avatar,
        articleCount: profile.articleCount,
        replyCount: profile.replyCount,
        beRepliedCount: profile.beRepliedCount,
        likeCount: profile.likeCount,
        collectCount: profile.collectCount,
        crawlStatus: 'profile_done',
      },
      update: {
        nickname: profile.nickname,
        title: profile.title,
        level: profile.level,
        avatar: profile.avatar,
        articleCount: profile.articleCount,
        replyCount: profile.replyCount,
        beRepliedCount: profile.beRepliedCount,
        likeCount: profile.likeCount,
        collectCount: profile.collectCount,
      },
    });
    console.log(`用户资料入库: ${profile.nickname} (uid=${uid})`);
    return profile;
  }

  /** 2. 文章列表层：翻页抓取列表并入库（去重 upsert） */
  async crawlUserArticleList(
    uid: string,
    options: { startPage?: number; endPage?: number } = {},
  ): Promise<number> {
    const crawler = new GuanUserArticleCrawler({
      uid,
      startPage: options.startPage,
      endPage: options.endPage,
    });
    const items = await crawler.crawlAllPages();

    let saved = 0;
    for (const item of items) {
      await this.saveArticleListItem(uid, item);
      saved += 1;
    }
    return saved;
  }

  private async saveArticleListItem(uid: string, item: GuanRawArticleItem) {
    const articleId = String(item.id);
    const publishTime = this.normalizeTime(item.created_at || item.pass_at);

    await this.prisma.guanArticle.upsert({
      where: { articleId },
      create: {
        articleId,
        authorUid: String(item.user_id || uid),
        authorNick: item.user_nick,
        title: item.title,
        summary: item.summary,
        images: item.pic ? [item.pic] : [],
        publishTime,
        location: item.location_text,
        likeCount: this.toNum(item.praise_num),
        viewCount: this.toNum(item.view_count),
        commentCount: this.toNum(item.comment_count),
        url:
          item.post_url ||
          `https://user.guancha.cn/main/content?id=${articleId}`,
        state: GuanArticleState.PENDING,
      },
      update: {
        title: item.title,
        summary: item.summary,
        likeCount: this.toNum(item.praise_num),
        viewCount: this.toNum(item.view_count),
        commentCount: this.toNum(item.comment_count),
      },
    });
  }

  /** 3. 文章详情层：遍历 pending 文章抓取正文/配图/评论 */
  async crawlPendingArticleDetails(uid?: string) {
    const where: any = { state: GuanArticleState.PENDING };
    if (uid) {
      where.authorUid = uid;
    }

    const articles = await this.prisma.guanArticle.findMany({
      where,
      orderBy: { publishTime: 'desc' },
    });
    const total = articles.length;
    console.log(`==> 待抓取详情文章数: ${total}`);

    let current = 0;
    for (const article of articles) {
      current += 1;
      console.log(`抓取详情 ${current}/${total} -> ${article.articleId}`);
      const detail = await this.detailCrawler.crawlArticleDetail(
        article.articleId,
      );

      if (!detail) {
        await this.prisma.guanArticle.update({
          where: { articleId: article.articleId },
          data: { state: GuanArticleState.DETAIL_FAILED },
        });
        continue;
      }

      await this.prisma.guanArticle.update({
        where: { articleId: article.articleId },
        data: {
          content: detail.content,
          images: detail.images.length ? detail.images : article.images,
          location: detail.location || article.location,
          likeCount: detail.likeCount || article.likeCount,
          viewCount: detail.viewCount || article.viewCount,
          commentCount: detail.commentCount || article.commentCount,
          publishTime:
            this.normalizeTime(detail.publishTime) || article.publishTime,
          state: GuanArticleState.DETAILED,
        },
      });

      // 评论入库
      await this.saveComments(article.articleId, detail.comments);
    }
  }

  private async saveComments(articleId: string, comments: GuanCommentItem[]) {
    if (!comments?.length) return;
    for (const c of comments) {
      const id = `${articleId}_${c.id}`;
      await this.prisma.guanComment.upsert({
        where: { id },
        create: {
          id,
          articleId,
          commenterUid: c.commenterUid,
          commenter: c.commenter,
          content: c.content,
          time: this.normalizeTime(c.time),
          location: c.location,
          upCount: c.upCount,
          downCount: c.downCount,
        },
        update: {
          upCount: c.upCount,
          downCount: c.downCount,
        },
      });
    }
  }

  /** 4. AI 分析：对已抓详情的文章做分类/摘要/情绪分析 */
  async analyzeArticles(uid?: string) {
    const where: any = { state: GuanArticleState.DETAILED };
    if (uid) {
      where.authorUid = uid;
    }

    const articles = await this.prisma.guanArticle.findMany({
      where,
      orderBy: { publishTime: 'desc' },
    });
    const total = articles.length;
    console.log(`==> 待 AI 分析文章数: ${total}`);

    let current = 0;
    for (const article of articles) {
      current += 1;
      console.log(`AI 分析 ${current}/${total} -> ${article.articleId}`);

      const text = (article.content || article.summary || '').slice(0, 4000);
      if (!text.trim()) continue;

      const prompt = this.buildAnalysisPrompt(article.title || '', text);
      try {
        const resp = await this.llmBaseService.callLLM(prompt);
        const parsed = this.parseAiResponse(resp);
        await this.prisma.guanArticle.update({
          where: { articleId: article.articleId },
          data: {
            category: parsed.category,
            aiSummary: parsed.summary,
            sentiment: parsed.sentiment,
            state: GuanArticleState.ANALYZED,
          },
        });
      } catch (error) {
        console.error(`AI 分析文章 ${article.articleId} 失败:`, error?.message);
      }
    }
  }

  private buildAnalysisPrompt(title: string, content: string): string {
    return [
      '你是一名内容分析助手。请阅读下面的文章，输出 JSON，包含三个字段：',
      'category（分类，从 财经/军事/科技/国际/社会/体育/其他 中选一个）、',
      'summary（80 字以内中文摘要）、',
      'sentiment（情绪倾向，从 正面/中性/负面 中选一个）。',
      '只输出 JSON，不要额外说明。',
      '',
      `标题：${title}`,
      `正文：${content}`,
    ].join('\n');
  }

  private parseAiResponse(resp: string): {
    category: string;
    summary: string;
    sentiment: string;
  } {
    const fallback = { category: '其他', summary: '', sentiment: '中性' };
    if (!resp) return fallback;
    const match = resp.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    try {
      const obj = JSON.parse(match[0]);
      return {
        category: obj.category || '其他',
        summary: obj.summary || '',
        sentiment: obj.sentiment || '中性',
      };
    } catch {
      return fallback;
    }
  }

  /**
   * 时间归一化：把「2小时前 / 昨天 11:02 / 06-26 10:35 / 2026-06-28 10:35」
   * 等混合格式统一转为 Date。
   */
  private normalizeTime(raw?: string): Date | null {
    if (!raw) return null;
    const text = String(raw).trim();

    // 纯数字时间戳
    if (/^\d{10,13}$/.test(text)) {
      const ts = text.length === 10 ? Number(text) * 1000 : Number(text);
      return new Date(ts);
    }

    const now = moment();

    // X分钟前 / X小时前 / X天前
    const relMatch = text.match(/(\d+)\s*(分钟|小时|天)前/);
    if (relMatch) {
      const value = Number(relMatch[1]);
      const unitMap: Record<string, moment.unitOfTime.DurationConstructor> = {
        分钟: 'minutes',
        小时: 'hours',
        天: 'days',
      };
      return now.subtract(value, unitMap[relMatch[2]]).toDate();
    }

    if (text.includes('刚刚')) {
      return now.toDate();
    }

    if (text.startsWith('昨天')) {
      const hm = text.replace('昨天', '').trim();
      const d = moment().subtract(1, 'day');
      if (hm) {
        const [h, m] = hm.split(':');
        d.set({ hour: Number(h) || 0, minute: Number(m) || 0, second: 0 });
      }
      return d.toDate();
    }

    // MM-DD HH:mm（无年份，补当前年）
    const mdMatch = text.match(/^(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?$/);
    if (mdMatch) {
      const d = moment({
        year: now.year(),
        month: Number(mdMatch[1]) - 1,
        day: Number(mdMatch[2]),
        hour: Number(mdMatch[3]) || 0,
        minute: Number(mdMatch[4]) || 0,
      });
      return d.toDate();
    }

    // 标准格式
    const parsed = moment(
      text,
      [
        'YYYY-MM-DD HH:mm:ss',
        'YYYY-MM-DD HH:mm',
        'YYYY-MM-DD',
        moment.ISO_8601,
      ],
      true,
    );
    if (parsed.isValid()) {
      return parsed.toDate();
    }

    const loose = moment(text);
    return loose.isValid() ? loose.toDate() : null;
  }

  private toNum(val: any): number {
    if (val === null || val === undefined) return 0;
    const n = parseInt(String(val).replace(/[^\d]/g, ''), 10);
    return Number.isNaN(n) ? 0 : n;
  }
}
