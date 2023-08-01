import * as Papa from 'papaparse';
import * as fs from 'fs';
import puppeteer from 'puppeteer';

const bootstrap = async () => {
  const options = {
    headless: false,
  };
  const width = 1440;
  const height = 800;

  const browser = await puppeteer.launch(options);
  const input_file = fs.readFileSync('ups.csv', 'utf8');
  const ups = Papa.parse(input_file, { header: true }).data;
  const output = [];

  const url = 'https://www.bilibili.com/';

  const page = await browser.newPage();
  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 3000,
    });

    page.setViewport({
      width: width,
      height: height,
    });
  } catch (error) {
    console.log(error);
    await page.close();
  }

  //   const videoUrl = 'https://space.bilibili.com/1937416537/video'
  //   for (const up of ups) {
  //     const page = await browser.newPage();
  //     try {
  //       await page.close();
  //     } catch (error) {
  //       console.error(error);
  //       await page.close();
  //     }
  //     break;
  //   }
  //   await browser.close();
};
bootstrap();
