import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readCsv, readFilesInDirectory, saveMd } from 'src/utils/file';
import * as _ from 'lodash';
import * as fs from 'fs/promises';
import { prompts } from './prompts';
import * as path from 'path';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { chromium } from 'playwright';
import { fileExists } from '../ai/util';
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
  public async analyseUp(file): Promise<any> {
    const fileName = path.basename(file, path.extname(file));
    const respFile = `output/bilibili/ups_resp/${fileName}.md`;

    if (fileExists(respFile)) {
      console.log(`${fileName} 的分析结果已存在，跳过...`);
      return true;
    }

    const fileStr = await fs.readFile(file, 'utf-8');

    const model = new ChatDeepSeek({
      apiKey: this.configService.get('deepseek.DS_KEY'),
      model: 'deepseek-chat',
    });

    const upName = fileName.split('_')[1];
    const prompt = prompts[2].replace('{upName}', upName);

    const messages = [new SystemMessage(prompt), new HumanMessage(fileStr)];

    const resp = await model.invoke(messages);

    saveMd(respFile, resp.content);
  }

  public async analyseUps(): Promise<any> {
    const files = readFilesInDirectory('output/bilibili/ups_titles');

    // const file = _.find(files, (f) => {
    //   return f.includes('小约翰可汗');
    // });

    for (const file of files) {
      console.log(`开始分析 ${file} 的视频标题...`);
      try {
        await this.analyseUp(file);
      } catch (error) {
        console.error(error);
      }
    }
  }

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
          });

          results.push(...list);
        } catch (e) {
          console.error('解析响应失败:', e);
          process.exit(1);
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
          throw new Error('到达30页，停止抓取');
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
      await this.prisma.biliArchive.createMany({
        data: results,
      });
    } catch (error) {
      console.error(error);
      await context.close();
      return false;
    }

    await context.close();
    return true;
  }

  public async getUpsContents(): Promise<any> {
    // const ups = await readCsv('output/bilibili/bilibili_followings.csv');
    const ups = await this.prisma.biliUps.findMany({
      select: {
        uname: true,
        mid: true,
        id: true,
      },
      where: {
        crawlStatus: crawlStatus.pending,
      },
      orderBy: {
        id: 'asc',
      },
    });
    for (const up of ups) {
      console.log(`开始获取 ${up.uname} 的视频列表...`);
      try {
        const resp = await this.getUpsArts(up);

        let status = crawlStatus.failed;
        if (!resp) {
          await sleep(this.waitTime);
        } else {
          status = crawlStatus.completed;
        }

        await this.prisma.biliUps.update({
          where: { id: up.id },
          data: { crawlStatus: status },
        });
      } catch (error) {
        console.error(error);
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
}
