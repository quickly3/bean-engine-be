import { chromium, BrowserContext } from 'playwright';
import * as path from 'path';
import { saveJsonFileToCsv } from 'src/utils/file';

class BilibiliCrawler {
  private chromePath: string;
  private userDataDir: string;
  private browserContext?: BrowserContext;

  constructor() {
    this.chromePath =
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    this.userDataDir = BilibiliCrawler.getChromeUserDataDir();
  }

  // 自动获取当前用户的 Chrome userDataDir
  private static getChromeUserDataDir(): string {
    const home = process.env.HOME || process.env.USERPROFILE;
    return `${home}/Library/Application Support/Google/Chrome/Default`;
  }

  // 启动持久化浏览器上下文
  async launchBrowser(): Promise<void> {
    this.browserContext = await chromium.launchPersistentContext(
      this.userDataDir,
      {
        executablePath: this.chromePath,
        headless: true,
      },
    );
  }

  // 关闭浏览器上下文
  async closeBrowser(): Promise<void> {
    if (this.browserContext) {
      await this.browserContext.close();
      this.browserContext = undefined;
    }
  }

  // 使用已打开的浏览器爬取指定页面内容
  async crawlWithOpenedBrowser(url: string): Promise<string> {
    if (!this.browserContext) {
      throw new Error('Browser context is not launched.');
    }
    const page = await this.browserContext.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    const content = await page.content();
    await new Promise((resolve) => setTimeout(resolve, 10000)); // 等待10秒
    await page.close();
    return content;
  }

  // 保存API响应内容到CSV文件
  private saveApiResponseToCsv(apiResponseBody: string, pn) {
    const filename = `output/bilibili_followings/pn_${pn}.csv`;
    try {
      const data = JSON.parse(apiResponseBody);
      const list = data.data?.list;
      if (!Array.isArray(list)) return;

      const _list = list.map((item) => ({
        mid: item.mid,
        uname: item.uname,
        sign: item.sign,
      }));
      saveJsonFileToCsv(filename, _list);
      const filePath = path.resolve(filename);
      console.log(`已保存到CSV: ${filePath}`);
    } catch (e) {
      console.error('保存CSV失败:', e);
    }
  }

  // 示例：获取B站首页内容并尝试点击下一页
  async fetchBilibiliHome(): Promise<any> {
    if (!this.browserContext) {
      await this.launchBrowser();
    }
    const url = 'https://space.bilibili.com/23970125/relation/follow';
    const page = await this.browserContext!.newPage();
    // 监听请求并捕获目标API的响应
    page.on('response', async (response) => {
      const apiUrl = 'https://api.bilibili.com/x/relation/followings';
      if (response.url().startsWith(apiUrl)) {
        try {
          apiResponseBody = await response.text();
          // 保存到CSV

          // get params pn from response.url()
          const urlObj = new URL(response.url());
          const pn = urlObj.searchParams.get('pn');
          console.log('当前页码 pn:', pn);

          this.saveApiResponseToCsv(apiResponseBody, pn);
        } catch (e) {
          console.error('获取API响应失败:', e);
        }
      }
    });

    let apiResponseBody: string | undefined;

    await page.goto(url, { waitUntil: 'networkidle' });

    // get sync request from https://api.bilibili.com/x/relation/followings?order=desc&order_type=&vmid=23970125&pn=1&ps=24&gaia_source=main_web&web_location=333.1387
    // const content = await page.content();

    let hasNext = true;
    while (hasNext) {
      try {
        // 等待"下一页"按钮出现，最多等待5秒
        const nextPageButton = await page.waitForSelector('text="下一页"', {
          timeout: 3000,
        });
        if (nextPageButton) {
          await nextPageButton.scrollIntoViewIfNeeded();

          await nextPageButton.click();

          await page.waitForLoadState('networkidle');
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.log('未找到下一页按钮或点击失败:');
        hasNext = false;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    await page.close();
    await this.closeBrowser();
  }
}

export default BilibiliCrawler;
