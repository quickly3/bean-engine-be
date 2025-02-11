import puppeteer from 'puppeteer';
import { saveJsonFile } from '../../src/utils/file';
import * as fs from 'fs';
import { readCookie } from '../bilibili/util';

const run = async () => {
  const headless = true;
  const options = {
    headless: headless,
    devtools: false,
  };
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1024 });
  let maxNum = 0;

  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  await page.setUserAgent(userAgent);

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
      saveJsonFile(`output/${maxNum}.json`, responseBody);
      maxNum--;
      if (maxNum > 0) {
        await new Promise((r) => setTimeout(r, 1000));
        console.log(maxNum, Date());
        await page.goto(
          `https://www.bilibili.com/v/popular/weekly?num=${maxNum}`,
        );
      }
    }

    if (response.url().includes(smsLoginUrl)) {
      const cookies = await browser.cookies();
      fs.writeFileSync(cookieFile, JSON.stringify(cookies));
    }
  });

  const cookies = readCookie(cookieFile);
  await browser.setCookie(...cookies);

  // Navigate the page to a URL.
  await page.goto('https://www.bilibili.com/v/popular/weekly');

  //

  const userAvaEle = await page.waitForSelector(userAva);

  if (userAvaEle) {
  } else {
    await page.waitForSelector(loginBtnSelector);
    const loginBtn = await page.$(loginBtnSelector);

    await loginBtn.click();
  }
};

run();
// Launch the browser and open a new blank page
