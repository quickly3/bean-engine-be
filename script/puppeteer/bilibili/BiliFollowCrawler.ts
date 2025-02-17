import * as _ from 'lodash';
import { Page } from 'puppeteer';
import * as Papa from 'papaparse';
import * as fs from 'fs';
import { getRandomUA } from './util';

export class BiliFollowCrawler {
  page: Page;
  items: any[] = [];
  totalCount: any;
  curPage = 1;
  upName: string;
  timeout = 1000;
  constructor(page) {
    this.page = page;
  }

  setTimeout(timeout) {
    this.timeout = timeout;
  }

  async crawlUpList() {
    this.items = [];
    const nameSel = '#h-name';
    const totalCountSel =
      '#page-follows > div > div.follow-sidenav > div.nav-container.follow-container > div.be-scrollbar.follow-list-container.ps > ul > li.follow-item.cur > span.num';
    const itemSelector =
      '#page-follows > div > div.follow-main > div.follow-content.section > div.content > ul.relation-list > li:nth-child(1)';

    try {
      await this.page.waitForSelector(itemSelector);
    } catch (error) {
      console.log('Missing user.');
      await this.page.screenshot({
        path: 'screenshot1.jpg',
      });
      return false;
    }

    const userName = await this.crwalTextBySel(nameSel);

    this.upName = userName;
    console.log('Up名：', userName);

    this.totalCount = await this.crwalTextBySel(totalCountSel);
    console.log('总关注数：', this.totalCount);

    const nextPageBtnSel =
      '#page-follows > div > div.follow-main > div.follow-content.section > div.content > ul.be-pager > li.be-pager-next';

    console.log('Page: ', this.curPage);
    await this.listPageParse();

    let nextPageBtn = await this.page.$(nextPageBtnSel);
    let hasNextPage = !(await nextPageBtn.isHidden());

    while (hasNextPage) {
      await nextPageBtn.click();

      await this.page.waitForTimeout(this.timeout);
      this.curPage += 1;
      console.log('Page: ', this.curPage);
      await this.listPageParse();
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
      const node = document.querySelector(selector);
      if (node) {
        return node.textContent;
      }
      return '';
    }, selector);
    return name;
  }

  async listPageParse() {
    const itemSelector =
      '#page-follows > div > div.follow-main > div.follow-content.section > div.content > ul.relation-list > li';

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

    const ups = await this.page.evaluate((params) => {
      const items = [];
      const { itemSelector, upName } = params;
      const nodes = document.querySelectorAll(itemSelector);
      nodes.forEach((n) => {
        const upName = n.querySelector('div.content > a > span').textContent;
        const url =
          'https:' + n.querySelector('div.content > a').getAttribute('href');
        items.push({
          upName,
          url,
        });
      });
      return items;
    }, params);

    this.items = _.concat(this.items, ups);
    console.log(`Ups count: ${this.items.length}/${this.totalCount}`);
  }

  async appendCSV(fileName, header) {
    const fileStr = Papa.unparse(this.items, { header });
    await fs.appendFileSync(fileName, fileStr, 'utf8');
  }
}
