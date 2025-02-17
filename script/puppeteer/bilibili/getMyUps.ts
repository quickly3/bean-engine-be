import puppeteer from 'puppeteer';
import { getRandomUA, parseCookieFile } from './util';
import { BiliFollowCrawler } from './BiliFollowCrawler';

const bootstrap = async () => {
  // const headless = false;
  const headless = true;

  const _cookies = parseCookieFile();

  const width = 1440;
  const height = 800;

  const options = {
    headless,
    args: [`--window-size=${width},${height}`],
  };

  const browser = await puppeteer.launch(options);

  const page = await browser.newPage();
  page.setViewport({
    width: width,
    height: height,
  });

  const headers = {
    Accept: '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9,zh-TW;q=0.8,zh;q=0.7',
    Origin: 'https://space.bilibili.com',
    Referer:
      'https://space.bilibili.com/10330740/video?tid=0&pn=106&keyword=&order=pubdate',
    'Sec-Ch-Ua':
      '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': 'macOS',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
  };

  try {
    const url = `https://space.bilibili.com/23970125/fans/follow`;

    const ua = getRandomUA();
    await page.setUserAgent(ua);

    await page.setExtraHTTPHeaders(headers);
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 3000,
    });
    await page.setCookie(..._cookies);

    const biliCrawler = new BiliFollowCrawler(page);

    biliCrawler.setTimeout(3000);
    await biliCrawler.crawlUpList();

    await biliCrawler.appendCSV('my-ups.csv', true);
  } catch (error) {
    console.error(error);
    await browser.close();
  }

  if (headless) {
    await browser.close();
  }
};
bootstrap();
