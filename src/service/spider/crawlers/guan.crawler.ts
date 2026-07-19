/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import axios from 'axios';
import * as _ from 'lodash';
import * as cheerio from 'cheerio';
import {
  GuanUserConfig,
  GuanRawArticleItem,
  GuanUserProfile,
  GuanArticleDetail,
  GuanCommentItem,
} from '../interface/guan.interface';
import { saveJsonFileToCsv } from 'src/utils/file';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class GuanUserArticleCrawler {
  private baseUrl = 'https://user.guancha.cn/user/get-published-list';
  private config: GuanUserConfig;

  constructor(config: GuanUserConfig) {
    this.config = {
      isSelf: 0,
      startPage: 1,
      endPage: 999,
      ...config,
    };
  }

  async crawlAllPages(): Promise<GuanRawArticleItem[]> {
    const allArticles: GuanRawArticleItem[] = [];
    const stopAtArticleId = this.config.stopAtArticleId;

    for (
      let page = this.config.startPage;
      page <= this.config.endPage;
      page++
    ) {
      try {
        console.log(page);
        const articles = await this.crawlPage(page);
        if (articles.length === 0) {
          break; // 如果没有更多文章，停止爬取
        }

        // 增量爬取：遇到数据库中已存在的最近文章，仅保留它之前的新文章并停止
        if (stopAtArticleId) {
          const hitIndex = articles.findIndex(
            (item) => String(item.id) === stopAtArticleId,
          );
          if (hitIndex !== -1) {
            allArticles.push(...articles.slice(0, hitIndex));
            console.log(`检测到已爬取文章 id=${stopAtArticleId}，停止增量爬取`);
            break;
          }
        }

        allArticles.push(...articles);
      } catch (error) {
        console.error(`Error crawling page ${page}:`, error);
        break;
      }
    }
    saveJsonFileToCsv(`output/guan/user_${this.config.uid}.csv`, allArticles);
    return allArticles;
  }

  async crawlPage(pageNo: number): Promise<GuanRawArticleItem[]> {
    const params = {
      page_no: pageNo,
      uid: this.config.uid,
      isSelf: this.config.isSelf,
    };

    const response = await axios.get(this.baseUrl, { params });
    const data: GuanRawArticleItem[] = _.get(response, 'data.data.items');

    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data;
  }
}

/**
 * 观察者网·风闻社区 用户资料 + 文章详情 爬虫
 *
 * - crawlUserProfile：抓取用户主页头部画像
 * - crawlArticleDetail：抓取单篇文章正文 + 配图 + 评论
 */
export class GuanArticleDetailCrawler {
  private profileUrl = 'https://user.guancha.cn/user/get-user-info-v2';
  private contentBaseUrl = 'https://user.guancha.cn/main/content';
  private requestDelay: number;

  constructor(params?: { requestDelay?: number }) {
    // 站点存在风控，默认请求间隔加随机延时
    this.requestDelay = params?.requestDelay ?? 1500;
  }

  private get headers() {
    return {
      'User-Agent': UA,
      Referer: 'https://user.guancha.cn/',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    };
  }

  /** 抓取用户主页头部画像 */
  async crawlUserProfile(uid: string): Promise<GuanUserProfile | null> {
    try {
      // 优先尝试 JSON 接口
      const resp = await axios.get(this.profileUrl, {
        params: { uid },
        headers: this.headers,
      });
      const info = _.get(resp, 'data.data') || _.get(resp, 'data');
      if (info && (info.user_nick || info.nickname)) {
        return {
          uid,
          nickname: info.user_nick || info.nickname || '',
          title: info.bigv_desc || info.user_description || '',
          level: String(info.user_level ?? ''),
          avatar: info.user_photo || info.avatar || '',
          articleCount: this.toNum(info.article_count ?? info.published_count),
          replyCount: this.toNum(info.reply_count),
          beRepliedCount: this.toNum(info.be_replied_count),
          likeCount: this.toNum(info.praise_count ?? info.like_count),
          collectCount: this.toNum(info.collection_count),
        };
      }
    } catch (error) {
      console.warn(
        `获取用户 ${uid} 资料接口失败，尝试解析主页 HTML`,
        error?.message,
      );
    }

    // 接口不可用时退化为解析主页 HTML
    return this.crawlUserProfileByHtml(uid);
  }

  private async crawlUserProfileByHtml(
    uid: string,
  ): Promise<GuanUserProfile | null> {
    try {
      const url = `https://user.guancha.cn/user/personal-homepage?uid=${uid}`;
      const resp = await axios.get(url, { headers: this.headers });
      const $ = cheerio.load(resp.data);
      const nickname = $('.user-name, .personal-name').first().text().trim();
      const title = $('.user-title, .personal-title').first().text().trim();
      if (!nickname) {
        return null;
      }
      return {
        uid,
        nickname,
        title,
        level: '',
        avatar: $('.user-avatar img, .personal-avatar img').attr('src') || '',
        articleCount: 0,
        replyCount: 0,
        beRepliedCount: 0,
        likeCount: 0,
        collectCount: 0,
      };
    } catch (error) {
      console.error(`解析用户 ${uid} 主页 HTML 失败:`, error?.message);
      return null;
    }
  }

  /** 抓取单篇文章详情（正文 + 配图 + 评论） */
  async crawlArticleDetail(
    articleId: string | number,
  ): Promise<GuanArticleDetail | null> {
    const url = `${this.contentBaseUrl}?id=${articleId}`;
    try {
      await sleep(this.requestDelay + Math.floor(Math.random() * 1000));
      const resp = await axios.get(url, { headers: this.headers });
      const $ = cheerio.load(resp.data);

      const title = $('.content-headline h3, .all-txt h3, h3')
        .first()
        .text()
        .trim();
      const authorNick = $('.user-name, .content-name').first().text().trim();
      const authorUid =
        $('[data-uid]').first().attr('data-uid') || this.extractUid($) || '';

      // 正文
      const $content = $('.all-txt, .content-detail, .article-content').first();
      const content = $content.text().replace(/\s+\n/g, '\n').trim();

      // 配图
      const images: string[] = [];
      $content.find('img').each((_i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src) images.push(src);
      });

      const location = $('.location, .ip-location').first().text().trim();
      const likeCount = this.toNum(
        $('.like-count, .praise-num').first().text(),
      );
      const viewCount = this.toNum($('.view-count').first().text());
      const publishTime = $('.content-time, .time, .pub-time')
        .first()
        .text()
        .trim();

      const comments = this.parseComments($);

      return {
        articleId: String(articleId),
        authorUid,
        authorNick,
        title,
        content,
        images,
        publishTime,
        location,
        likeCount,
        viewCount,
        commentCount: comments.length,
        url,
        comments,
      };
    } catch (error) {
      console.error(`爬取文章 ${articleId} 详情失败:`, error?.message);
      return null;
    }
  }

  private parseComments($: cheerio.CheerioAPI): GuanCommentItem[] {
    const comments: GuanCommentItem[] = [];
    $('.comment-item, .reply-item, .comment-list-item').each((i, el) => {
      const $el = $(el);
      const commenter = $el
        .find('.comment-name, .user-name')
        .first()
        .text()
        .trim();
      const content = $el
        .find('.comment-content, .reply-content')
        .first()
        .text()
        .trim();
      if (!content) return;
      comments.push({
        id: $el.attr('data-id') || `${Date.now()}_${i}`,
        commenterUid: $el.find('[data-uid]').first().attr('data-uid') || '',
        commenter,
        content,
        time: $el.find('.comment-time, .time').first().text().trim(),
        location: $el.find('.location, .ip-location').first().text().trim(),
        upCount: this.toNum($el.find('.up-count, .praise').first().text()),
        downCount: this.toNum($el.find('.down-count, .tread').first().text()),
      });
    });
    return comments;
  }

  private extractUid($: cheerio.CheerioAPI): string {
    const href = $('a[href*="uid="]').first().attr('href') || '';
    const match = href.match(/uid=(\d+)/);
    return match ? match[1] : '';
  }

  private toNum(val: any): number {
    if (val === null || val === undefined) return 0;
    const n = parseInt(String(val).replace(/[^\d]/g, ''), 10);
    return Number.isNaN(n) ? 0 : n;
  }
}
