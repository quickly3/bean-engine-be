import * as _ from 'lodash';
import { Page } from 'puppeteer';
import * as Papa from 'papaparse';
import * as fs from 'fs';
import { getRandomUA } from './util';

export class BiliCrawler {
  page: Page;
  items: any[] = [];
  totalCount: any;
  curPage = 1;
  upName: string;
  timeout = 1000;
  uid;
  constructor(page) {
    this.page = page;
  }

  setUid(uid) {
    this.uid = uid;
  }

  setTimeout(timeout) {
    this.timeout = timeout;
  }

  async crawlVideo() {
    this.items = [];
    const nameSel = '#h-name';
    const totalCountSel = '#submit-video-type-filter > a.active > span';
    const itemSelector = '#submit-video-list > ul.clearfix.cube-list > li';

    try {
      await this.page.waitForSelector(itemSelector);
    } catch (error) {
      console.log('Missing user: ', this.uid);
      await this.page.screenshot({
        path: 'screenshot1.jpg',
      });
      return false;
    }

    const userName = await this.crwalTextBySel(nameSel);

    this.upName = userName;
    console.log('Up名：', userName, this.uid);

    this.totalCount = await this.crwalTextBySel(totalCountSel);
    console.log('总视频数：', this.totalCount);

    const nextPageBtnSel =
      '#submit-video-list > ul.be-pager > li.be-pager-next';

    console.log('Page: ', this.curPage);
    await this.videoPageParse();

    let nextPageBtn = await this.page.$(nextPageBtnSel);
    let hasNextPage = !(await nextPageBtn.isHidden());

    while (hasNextPage) {
      await nextPageBtn.click();

      await this.page.waitForTimeout(this.timeout);
      this.curPage += 1;
      console.log('Page: ', this.curPage);
      await this.videoPageParse();
      nextPageBtn = await this.page.$(nextPageBtnSel);
      hasNextPage = !(await nextPageBtn.isHidden());

      if (!hasNextPage && this.totalCount > this.items.length) {
        await this.page.screenshot({ path: 'beForenextPageBtn.png' });
        console.log('Not end yet');
        this.page.waitForTimeout(60000);

        const _userAgent = getRandomUA();
        await this.page.setUserAgent(_userAgent);
        await this.page.reload();
        nextPageBtn = await this.page.$(nextPageBtnSel);
        hasNextPage = !(await nextPageBtn.isHidden());
        await this.page.screenshot({ path: 'nextPageBtn.png' });
        console.log('hasNextPage', hasNextPage);
      }
    }
  }

  async crwalTextBySel(selector) {
    const name = await this.page.evaluate((selector) => {
      console.log('selector', selector);
      const node = document.querySelector(selector);
      console.log('node', node);
      console.log('textContent', node.textContent);

      if (node) {
        return node.textContent;
      }
      return '';
    }, selector);
    return name;
  }

  async videoPageParse() {
    const itemSelector = '#submit-video-list > ul.clearfix.cube-list > li';

    const params = {
      itemSelector,
      upName: this.upName,
    };

    while (true) {
      try {
        await this.page.waitForSelector(itemSelector);
        break;
      } catch (error) {
        console.error('waitForSelector error');
        await this.page.screenshot({
          path: 'screenshot.jpg',
        });
        // throw error;
        this.page.waitForTimeout(10000);
        await this.page.reload();
        await this.page.waitForSelector(itemSelector);
      }
    }

    const videos = await this.page.evaluate((params) => {
      const items = [];
      const { itemSelector, upName } = params;
      const nodes = document.querySelectorAll(itemSelector);
      nodes.forEach((n) => {
        const title = n.querySelector('a:nth-child(2)').textContent;
        const url =
          'https:' + n.querySelector('a:nth-child(1)').getAttribute('href');

        let imgNode = n.querySelector(
          'a:nth-child(1) > div.b-img > picture > img',
        );

        if (!imgNode) {
          imgNode = n.querySelector('a.cover > img');
        }

        const imageUrl = 'https:' + imgNode.getAttribute('src');

        const viewCount = n
          .querySelector('div > span.play > span')
          .textContent.trim();
        const publishDate = n
          .querySelector('div > span.time')
          .textContent.trim();
        const item = {
          upName,
          title,
          url,
          imageUrl,
          viewCount,
          publishDate,
        };
        items.push(item);
      });
      return items;
    }, params);

    this.items = _.concat(this.items, videos);
    console.log(`Videos count: ${this.items.length}/${this.totalCount}`);
  }

  async appendCSV(fileName, header) {
    const fileStr = Papa.unparse(this.items, { header });
    await fs.appendFileSync(fileName, fileStr, 'utf8');
  }

  getNextPageUrl() {
    const nextPage = this.curPage + 1;
    const nextPageUrl = `https://space.bilibili.com/${this.uid}/video?tid=0&pn=${nextPage}&keyword=&order=pubdate`;
  }
}
