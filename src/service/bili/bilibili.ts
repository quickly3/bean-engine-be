import { chromium } from 'playwright';
import { saveJsonFileToCsv } from '../../utils/file';
import * as dotenv from 'dotenv';
dotenv.config({
  path: ['.env', '../../.env'],
});

(async () => {
  // 使用已安装的 Chrome 浏览器，并读取系统中的用户信息
  const userDataDir = process.env.CHROME_USER_DATA_DIR;

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // 显示浏览器窗口
    channel: 'chrome', // 使用正式版 Chrome
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await context.newPage();
  await page.goto('https://www.bilibili.com/');

  const results: { name: string; url: string }[] = [];
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
            results.push({
              name: item.uname,
              url: item.homepage || `https://space.bilibili.com/${item.mid}`,
            });
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

  const totalPageText = await page.locator('span:has-text("共")').textContent();
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
  await saveJsonFileToCsv(
    '../../output/bilibili/bilibili_followings.csv',
    results,
  );
  await context.close();
})();
