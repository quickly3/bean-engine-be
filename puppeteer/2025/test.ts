import puppeteer from 'puppeteer';
import { saveJsonFile } from '../../src/utils/file';
// Or import puppeteer from 'puppeteer-core';

const run = async () => {
  const headless = false;
  const options = {
    headless: headless,
    devtools: true,
  };
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1024 });

  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  await page.setUserAgent(userAgent);

  // await page.setRequestInterception(true);

  const listReqUrl =
    'https://api.bilibili.com/x/web-interface/popular/series/one';

  page.on('response', async (response) => {
    if (response.url().includes(listReqUrl)) {
      const responseBody = await response.json(); // 或者 response.text() 如果响应是文本
      console.log('Intercepted Response:', responseBody);
      // throw new Error('Something went wrong during request interception!');
      saveJsonFile('responseBody.json', responseBody);
    }
  });

  // Navigate the page to a URL.
  await page.goto('https://www.bilibili.com/v/popular/weekly?num=307');

  // Set screen size.

  // 监听响应事件

  // Type into search box.
  // await page.locator('.devsite-search-field').fill('automate beyond recorder');

  // // Wait and click on first result.
  // await page.locator('.devsite-result-item-link').click();

  // // Locate the full title with a unique string.
  // const textSelector = await page
  //   .locator('text/Customize and automate')
  //   .waitHandle();
  // const fullTitle = await textSelector?.evaluate((el) => el.textContent);

  // // Print the full title.
  // console.log('The title of this blog post is "%s".', fullTitle);

  // await browser.close();
};

run();
// Launch the browser and open a new blank page
