import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readCsv, readFilesInDirectory, saveMd } from 'src/utils/file';
import * as _ from 'lodash';
import { prompts } from './prompts';
import * as path from 'path';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { chromium } from 'playwright';
import { ChatDeepSeek } from '@langchain/deepseek';
import { PrismaService } from 'src/prisma/prisma.service';
import momenttz from 'moment-timezone';
import { sleep } from 'openai/core.mjs';

enum crawlStatus {
  pending = 'pending',
  completed = 'completed',
  failed = 'failed',
}

@Injectable()
export class BiliService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}
  // serch repo by name use octokit
  waitTime = 2000;
  public async genUpTitles(file) {
    // filename not include surfix
    const fileName = path.basename(file, path.extname(file));

    const articles = await readCsv(file);

    const titles = articles.map((item) => item.title);
    saveMd(`output/bilibili/ups_titles/${fileName}.txt`, titles.join('\n'));
  }

  public async genUpsTitles() {
    const files = readFilesInDirectory('output/bilibili/ups');

    for (const file of files) {
      await this.genUpTitles(file);
    }
  }
  public async analyzeUp(mid): Promise<any> {
    const biliUp = await this.prisma.biliUps.findFirst({
      where: {
        mid: mid,
      },
    });

    if (!biliUp) {
      return false;
    }

    const arts = await this.prisma.biliVideos.findMany({
      where: {
        mid: mid,
      },
    });

    if (arts.length === 0) {
      console.log(`${biliUp.uname} 没有视频，跳过...`);
      return true;
    }

    const prompt = prompts[2].replace('{upName}', biliUp.uname);
    const titlesStr = arts.map((a) => a.title).join('\n');

    const messages = [new SystemMessage(prompt), new HumanMessage(titlesStr)];
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

    await this.prisma.biliUpAnalysis.deleteMany({
      where: {
        mid: mid,
        type: 'title_analysis',
      },
    });

    await this.prisma.biliUpAnalysis.create({
      data: {
        mid: mid,
        content: respContent,
        type: 'title_analysis',
      },
    });
    console.log(`分析 ${biliUp.uname} 完成`);
    return true;
  }

  // public async analyseUps(mid): Promise<any> {
  //   const articles = await this.prisma.biliVideos.findMany({
  //     where: {
  //       mid: mid,
  //     },
  //   });

  //   const files = readFilesInDirectory('output/bilibili/ups_titles');

  //   // const file = _.find(files, (f) => {
  //   //   return f.includes('小约翰可汗');
  //   // });

  //   for (const file of files) {
  //     console.log(`开始分析 ${file} 的视频标题...`);
  //     try {
  //       await this.analyseUp(file);
  //     } catch (error) {
  //       console.error(error);
  //     }
  //   }
  // }

  public async getUpsArts(up) {
    const { mid } = up;

    const url = `https://space.bilibili.com/${mid}/video`;

    const id = url.match(/space\.bilibili\.com\/(\d+)/)?.[1];

    // const csvFilePath = `output/bilibili/ups/${id}_${name}.csv`;

    // if (fileExists(csvFilePath)) {
    //   console.log(`${name} 的视频列表已存在，跳过...`);
    //   return true;
    // }

    const listUrl = `https://space.bilibili.com/${id}/upload/video`;

    const userDataDir = process.env.CHROME_USER_DATA_DIR;

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: true, // 显示浏览器窗口
      channel: 'chrome', // 使用正式版 Chrome
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await context.newPage();

    const results: any[] = [];

    const nextBtnSelector = 'button:has-text("下一页")';
    // const lastBtnSelector = 'button:has-text("55")';

    let totalPages: number | null = null;

    let follower = 0;
    let following = 0;
    let likes = 0;
    let view = 0;
    let totalVideos = 0;

    page.on('response', async (response) => {
      if (
        response
          .url()
          .startsWith('https://api.bilibili.com/x/space/wbi/arc/search')
      ) {
        try {
          const urlObj = new URL(response.request().url());
          const pn = urlObj.searchParams.get('pn');
          console.log(`当前请求 pn 参数值: ${pn}/${totalPages}`);
          const json = await response.json();
          let list = _.get(json, 'data.list.vlist', []);
          list = _.map(list, (item) => {
            return {
              title: item.title,
              subtitle: item.subtitle,
              description: item.description,
              comment: item.comment,
              typeid: item.typeid,
              play: parseInt(item.play),
              pic: item.pic,
              copyright: item.copyright,
              review: item.review,
              author: item.author,
              mid: BigInt(item.mid),
              created: item.created,
              length: item.length,
              video_review: item.video_review,
              aid: item.aid ? BigInt(item.aid) : undefined,
              bvid: item.bvid,
              season_id: item.season_id,
              createdAt: momenttz(item.created * 1000).format(
                'YYYY-MM-DDTHH:mm:ss[Z]',
              ),
            };

            totalVideos = _.get(json, 'data.page.total', 0);
          });

          results.push(...list);
        } catch (e) {
          console.error('解析search响应失败:', e);
          process.exit(1);
        }
      }

      if (
        response.url().startsWith('https://api.bilibili.com/x/relation/stat')
      ) {
        if (!follower || follower === 0) {
          try {
            const json = await response.json();
            const data = _.get(json, 'data');
            follower = data.follower || 0;
            following = data.following || 0;
          } catch (e) {
            console.error('解析stat响应失败:', e);
          }
        }
      }

      if (
        response.url().startsWith('https://api.bilibili.com/x/space/upstat')
      ) {
        if (!likes || likes === 0) {
          try {
            const json = await response.json();
            const data = _.get(json, 'data');
            likes = data.likes || 0;
            view = _.get(data, 'archive.view') || 0;
          } catch (e) {
            console.error('解析upstat响应失败:', e);
          }
        }
      }
    });

    let hasNext = true;

    await page.goto(listUrl);
    try {
      await page.waitForSelector(nextBtnSelector, {
        timeout: 2000,
      });
    } catch {
      hasNext = false;
    }

    try {
      await page.waitForSelector('span:has-text("共")', {
        timeout: 500,
      });

      const totalPageText = await page
        .locator('span:has-text("共")')
        .textContent();
      const match = totalPageText?.match(/共\s*(\d+)\s*页/);
      totalPages = match ? parseInt(match[1], 10) : null;
      console.log('总页数:', totalPages);
    } catch (error) {
      console.error('总页数:', 1, error);
    }

    while (hasNext) {
      try {
        const currPage = await page
          .locator('button.vui_button--active')
          .textContent();

        if (currPage === '30') {
          throw new Error(`到达${currPage}页，停止抓取`);
        }

        const nextBtn = await page.waitForSelector(nextBtnSelector, {
          timeout: 2000,
        });
        await page.waitForTimeout(this.waitTime);
        await nextBtn.click();
        // await page.waitForTimeout(1000);
        // await page.waitForSelector(nextBtnSelector, {
        //   timeout: 1000,
        // });
      } catch (error) {
        if (error.message.includes('Timeout')) {
          console.log('没有下一页了，抓取结束');
        } else {
          console.log(error.message);
        }

        hasNext = false;
        break;
      }
    }

    // await saveJsonFileToCsv(csvFilePath, results);

    try {
      await this.prisma.biliVideos.deleteMany({
        where: { mid: mid },
      });
      await this.prisma.biliVideos.createMany({
        data: results,
      });
    } catch (error) {
      console.error(error);
      await context.close();
      return false;
    }

    await context.close();
    return {
      data: {
        follower: BigInt(follower),
        following: BigInt(following),
        likes: BigInt(likes),
        view: BigInt(view),
        totalVideos,
      },
    };
  }

  public async getUpsContents(mid): Promise<any> {
    // const ups = await readCsv('output/bilibili/bilibili_followings.csv');
    const ups = await this.prisma.biliUps.findMany({
      select: {
        uname: true,
        mid: true,
        id: true,
      },
      where: {
        crawlStatus: crawlStatus.pending,
        mid,
        // mid: 13736113,
      },
      orderBy: {
        id: 'asc',
      },
    });
    for (const up of ups) {
      console.log(`开始获取 ${up.uname} ${up.mid} 的视频列表...`);
      try {
        const resp = await this.getUpsArts(up);

        let updateData: any = {
          crawlStatus: crawlStatus.failed,
        };
        if (!resp) {
          await sleep(this.waitTime);
        } else {
          updateData = {
            crawlStatus: crawlStatus.completed,
            ...resp.data,
          };
        }
        await this.prisma.biliUps.update({
          where: { id: up.id },
          data: updateData,
        });
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    }
  }

  public async genFollowings() {
    const userDataDir = process.env.CHROME_USER_DATA_DIR;

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: true, // 显示浏览器窗口
      channel: 'chrome', // 使用正式版 Chrome
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await context.newPage();
    await page.goto('https://www.bilibili.com/');

    const results: any[] = [];
    const nextBtnSelector = 'button:has-text("下一页")';
    // const lastBtnSelector = 'button:has-text("55")';

    let totalPages: number | null = null;

    page.on('response', async (response) => {
      if (
        response
          .url()
          .startsWith('https://api.bilibili.com/x/relation/followings')
      ) {
        try {
          const urlObj = new URL(response.request().url());
          const pn = urlObj.searchParams.get('pn');
          console.log(`当前请求 pn 参数值: ${pn}/${totalPages}`);
          const json = await response.json();
          if (json.data && Array.isArray(json.data.list)) {
            json.data.list.forEach((item: any) => {
              delete item.vip;
              if (!item.tag) {
                item.tag = [];
              }
              results.push(item);
            });
          }
        } catch (e) {
          console.error('解析响应失败:', e);
        }
      }
    });

    // 跳转到个人空间关注列表页
    await page.goto(
      'https://space.bilibili.com/23970125/relation/follow?spm_id_from=333.1007.0.0',
    );
    // 等待关注列表渲染完毕
    await page.waitForSelector(nextBtnSelector);

    const totalPageText = await page
      .locator('span:has-text("共")')
      .textContent();
    const match = totalPageText?.match(/共\s*(\d+)\s*页/);
    totalPages = match ? parseInt(match[1], 10) : null;
    console.log('总页数:', totalPages);

    // await page.click(lastBtnSelector);

    let hasNext = true;

    try {
      await page.waitForSelector(nextBtnSelector, {
        timeout: 2000,
      });
    } catch {
      hasNext = false;
    }

    while (hasNext) {
      try {
        const nextBtn = await page.waitForSelector(nextBtnSelector, {
          timeout: 2000,
        });
        await nextBtn.click();
        // await page.waitForTimeout(1000);
        await page.waitForSelector(nextBtnSelector, {
          timeout: 2000,
        });
      } catch {
        hasNext = false;
        break;
      }
    }

    await context.close();
    await this.prisma.biliUps.createMany({
      data: results,
    });
  }

  public async login() {
    const userDataDir = process.env.CHROME_USER_DATA_DIR;

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false, // 显示浏览器窗口
      channel: 'chrome', // 使用正式版 Chrome
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await context.newPage();
    await page.goto('https://www.bilibili.com/');
  }

  public async videoPage(bvid) {
    const url = `https://www.bilibili.com/video/${bvid}`;

    const userDataDir = process.env.CHROME_USER_DATA_DIR;

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: true, // 显示浏览器窗口
      channel: 'chrome', // 使用正式版 Chrome
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await context.newPage();
    await page.goto(url);

    // wait for html page loading compeleted
    await page.waitForLoadState('domcontentloaded');

    // Get window._playinfo from the page context
    const videoData = await page.evaluate(
      () => (window as any).__INITIAL_STATE__.videoData,
    );
    const { tname, tname_v2, desc, stat } = videoData;
    const mid = _.get(videoData, 'owner.mid', BigInt(0));

    await this.prisma.biliVideos.updateMany({
      where: { bvid: bvid },
      data: {
        tname,
        tname_v2,
        description: desc,
        play: stat.view,
        danmaku: stat.danmaku,
        comment: stat.reply,
        favorite: stat.favorite,
        coin: stat.coin,
        share: stat.share,
        now_rank: stat.now_rank,
        his_rank: stat.his_rank,
        like: stat.like,
        dislike: stat.dislike,
        evaluation: stat.evaluation,
        vt: stat.vt,
        viewseo: stat.viewseo,
        state: 'updated',
      },
    });

    const honors = _.get(videoData, 'honor_reply.honor', []);

    await this.prisma.videoHonors.deleteMany({
      where: { bvid: bvid },
    });

    if (honors.length > 0) {
      const datas = honors.map((h: any) => {
        return {
          mid: mid,
          bvid: bvid,
          ...h,
        };
      });
      await this.prisma.videoHonors.createMany({
        data: datas,
      });
    }

    await context.close();
  }

  public async upVideoPages(mid) {
    const videos = await this.prisma.biliVideos.findMany({
      where: {
        mid: mid,
      },
    });

    const userDataDir = process.env.CHROME_USER_DATA_DIR;

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: true, // 显示浏览器窗口
      channel: 'chrome', // 使用正式版 Chrome
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await context.newPage();

    const total = videos.length;
    let curr = 0;

    for (const video of videos) {
      curr += 1;
      console.log(
        `正在处理视频 ${curr}/${total} ${video.title} ${video.bvid} ...`,
      );

      const bvid = video.bvid;
      const url = `https://www.bilibili.com/video/${bvid}`;

      await page.goto(url);

      // wait for html page loading compeleted
      await page.waitForLoadState('domcontentloaded');

      // Get window._playinfo from the page context
      const videoData = await page.evaluate(
        () => (window as any).__INITIAL_STATE__.videoData,
      );
      const { tname, tname_v2, desc, stat } = videoData;
      const mid = _.get(videoData, 'owner.mid', BigInt(0));

      await this.prisma.biliVideos.updateMany({
        where: { bvid: bvid },
        data: {
          tname,
          tname_v2,
          description: desc,
          play: stat.view,
          danmaku: stat.danmaku,
          comment: stat.reply,
          favorite: stat.favorite,
          coin: stat.coin,
          share: stat.share,
          now_rank: stat.now_rank,
          his_rank: stat.his_rank,
          like: stat.like,
          dislike: stat.dislike,
          evaluation: stat.evaluation,
          vt: stat.vt,
          viewseo: stat.viewseo,
          state: 'updated',
        },
      });

      const honors = _.get(videoData, 'honor_reply.honor', []);

      await this.prisma.videoHonors.deleteMany({
        where: { bvid: bvid },
      });

      if (honors.length > 0) {
        const datas = honors.map((h: any) => {
          return {
            mid: mid,
            bvid: bvid,
            ...h,
          };
        });
        await this.prisma.videoHonors.createMany({
          data: datas,
        });
      }
    }
    await context.close();
  }
}
