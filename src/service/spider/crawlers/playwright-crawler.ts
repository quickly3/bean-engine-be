import { Browser, chromium } from 'playwright';

export async function crawlWithOpenedBrowser(
  browser: Browser,
  url: string,
): Promise<string> {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const content = await page.content();
  await new Promise((resolve) => setTimeout(resolve, 10000)); // 等待10秒
  await page.close();
  await context.close();
  return content;
}

// 自动获取当前用户的 Chrome userDataDir
function getChromeUserDataDir() {
  const home = process.env.HOME || process.env.USERPROFILE;
  // Mac 默认 profile 路径
  return `${home}/Library/Application Support/Google/Chrome/Default`;
}

// 示例：使用 crawlWithOpenedBrowser 获取 B站首页内容
export async function fetchBilibiliHome() {
  const chromePath =
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const userDataDir = getChromeUserDataDir();

  const browser = await chromium.launchPersistentContext(userDataDir, {
    executablePath: chromePath,
    headless: false,
  });
  try {
    const url = 'https://space.bilibili.com/23970125/relation/follow';
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    const content = await page.content();

    try {
      // 等待"下一页"按钮出现，最多等待5秒
      const nextPageButton = await page.waitForSelector('text="下一页"', {
        timeout: 5000,
      });
      console.log(1);
      if (nextPageButton) {
        // 确保按钮在视图中并且可点击
        await nextPageButton.scrollIntoViewIfNeeded();
        console.log(2);

        await nextPageButton.click();
        console.log(3);

        // 等待页面加载完成
        await page.waitForLoadState('networkidle');
        console.log(4);
      }
    } catch (error) {
      console.log('未找到下一页按钮或点击失败:', error);
    }

    // 在返回内容前等待10秒
    await new Promise((resolve) => setTimeout(resolve, 10000));
    return content;
  } finally {
    await browser.close();
  }
}
