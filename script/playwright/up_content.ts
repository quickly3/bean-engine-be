import { readCsv } from '../../src/utils/file';
import { chromium } from 'playwright';
import { saveJsonFileToCsv } from '../../src/utils/file';
import * as _ from 'lodash';

const getUpsArts = async (up) => {
  const { url, name } = up;
  const id = url.match(/space\.bilibili\.com\/(\d+)/)?.[1];

  const listUrl = `https://space.bilibili.com/${id}/upload/video`;

  const context = await chromium.launchPersistentContext(
    '/Users/hongbinzhou/Library/Application Support/Google/Chrome/Default',
    {
      headless: true, // 显示浏览器窗口
      channel: 'chrome', // 使用正式版 Chrome
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  );
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
        const list = _.get(json, 'data.list.vlist', []);
        results.push(...list);
      } catch (e) {
        console.error('解析响应失败:', e);
      }
    }
  });

  await page.goto(listUrl);
  await page.waitForSelector(nextBtnSelector);

  const totalPageText = await page.locator('span:has-text("共")').textContent();
  const match = totalPageText?.match(/共\s*(\d+)\s*页/);
  totalPages = match ? parseInt(match[1], 10) : null;
  console.log('总页数:', totalPages);

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
        timeout: 1000,
      });
      await nextBtn.click();
      // await page.waitForTimeout(1000);
      await page.waitForSelector(nextBtnSelector, {
        timeout: 1000,
      });
    } catch {
      hasNext = false;
      break;
    }
  }
  await saveJsonFileToCsv(
    `../../output/bilibili/ups/${id}_${name}.csv`,
    results,
  );
  await context.close();
};

(async () => {
  const ups = await readCsv('../../output/bilibili/bilibili_followings.csv');
  const up = _.find(ups, { name: '小约翰可汗' });

  await getUpsArts(up);
})();
