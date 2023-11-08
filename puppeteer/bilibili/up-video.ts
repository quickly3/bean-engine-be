import * as Papa from 'papaparse';
import * as fs from 'fs';
import puppeteer from 'puppeteer';
import { BiliCrawler } from './BiliCrawler';
import { getRandomUA, parseCookieFile } from './util';

const bootstrap = async () => {
  //   const headless = false;
  const headless = true;
  const test = false;
  const uid = '23947287';

  const _cookies = parseCookieFile();

  const width = 1440;
  const height = 800;

  const options = {
    headless,
    args: [`--window-size=${width},${height}`],
  };

  const browser = await puppeteer.launch(options);
  //   'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
  //   console.log(await browser.userAgent());
  const input_file = fs.readFileSync('ups.csv', 'utf8');
  const ups = Papa.parse(input_file, { header: true }).data;
  const output = [];

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
    const url = `https://space.bilibili.com/${uid}/video`;

    console.log('url', url);
    const ua = getRandomUA();
    await page.setUserAgent(ua);

    await page.setExtraHTTPHeaders(headers);
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 3000,
    });
    await page.reload({
      waitUntil: 'domcontentloaded',
      timeout: 3000,
    });
    await page.setCookie(..._cookies);

    const biliCrawler = new BiliCrawler(page);
    biliCrawler.setUid(uid);

    await biliCrawler.crawlVideo();
    const header = true;
    await biliCrawler.appendCSV(`ups/${uid}.csv`, header);
    // await page.close();
  } catch (error) {
    console.error(error);
    await browser.close();
  }

  if (headless) {
    await browser.close();
  }
};
bootstrap();
