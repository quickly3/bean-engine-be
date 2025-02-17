// import puppeteer from 'puppeteer';
import * as fs from 'fs';

import puppeteer from 'puppeteer-extra';
import { saveJsonFile } from 'src/utils/file';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const run = async () => {
  const headless = false;
  const options = {
    headless: headless,
    devtools: false,
    protocolTimeout: 2400000,
  };
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1024 });
  let maxNum = 0;

  // const userAgent =
  //   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  // await page.setUserAgent(userAgent);
  await page.setExtraHTTPHeaders({
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    // 'sec-ch-ua':
    //   '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
    // 'upgrade-insecure-requests': '1',
    // accept:
    //   'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    // 'accept-encoding': 'gzip, deflate, br, zstd',
    // 'accept-language': 'en-US,en;q=0.9,zh-TW;q=0.8,zh;q=0.7,ja;q=0.6',
    // pragma: 'no-cache',
    // priority: 'u=0, i',
    // 'cache-control:': 'no-cache',
  });

  // await page.setRequestInterception(true);

  const listReqUrl =
    'https://api.bilibili.com/x/web-interface/popular/series/one';

  const smsLoginUrl =
    'https://passport.bilibili.com/x/passport-login/web/login/sms';

  const loginBtnSelector = '.header-login-entry > span';
  const userAva = '.header-entry-mini';

  const cookieFile = 'output/cookies.json';
  page.on('response', async (response) => {
    if (response.url().includes(listReqUrl)) {
      const jumpUrl = new URL(response.url());
      const urlParams = new URLSearchParams(jumpUrl.search);
      maxNum = parseInt(urlParams.get('number'));

      const responseBody = await response.json();
      console.log(maxNum, Date());
      saveJsonFile(`output/weekly/${maxNum}.json`, responseBody);
      maxNum--;

      if (maxNum === 1) {
        browser.close();
      }

      // if (maxNum > 0) {
      //   await new Promise((r) => setTimeout(r, 3000));
      //   await page.goto(
      //     `https://www.bilibili.com/v/popular/weekly?num=${maxNum}`,
      //   );
      // } else {
      //   browser.close();
      // }
    }

    if (response.url().includes(smsLoginUrl)) {
      const cookies = await browser.cookies();
      fs.writeFileSync(cookieFile, JSON.stringify(cookies));
    }
  });

  // const cookies = readCookie(cookieFile);
  // await browser.setCookie(...cookies);

  // Navigate the page to a URL.
  await page.goto('https://www.bilibili.com/v/popular/weekly');

  // await page.goto('https://bot.sannysoft.com');

  //
  // try {
  //   await page.waitForSelector(userAva);
  // } catch (error) {
  //   await page.waitForSelector(loginBtnSelector);
  //   const loginBtn = await page.$(loginBtnSelector);

  //   await loginBtn.click();
  // }

  // await new Promise((r) => setTimeout(r, 3000));
  const itemBtnsSelector =
    '#app > div > div.popular-video-container.weekly-list > div.weekly-header > div.date-info > div > div';

  await page.waitForSelector(itemBtnsSelector);

  // // const itemBtns = await page.$$(itemBtnsSelector);

  await page.$$eval(itemBtnsSelector, async (es) => {
    for (const e of es) {
      await new Promise((r) => setTimeout(r, 2000));
      e.click();
    }
  });

  // await itemBtns[1].click();
  // console.log(itemBtns);
  // for (const btn of itemBtns) {
  //   await btn.click();
  //   await new Promise((r) => setTimeout(r, 3000));
  // }
};

run();
// Launch the browser and open a new blank page
