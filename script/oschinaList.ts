import * as fs from 'fs';
import { parse } from 'node-html-parser';

async function run() {
  const file = fs.readFileSync('ostree.html');
  const fileStr = file.toString('utf8');

  const osTree = await parse(fileStr);

  const topItems = osTree.querySelectorAll('#projectCategoryMenu > div');
  const host = 'https://www.oschina.net';

  const list = [];
  for (const topItem of topItems) {
    const topCate = topItem.firstChild.rawText.trim();
    const subItems = topItem.querySelectorAll('.three');
    const children = [];

    for (const subItem of subItems) {
      const bottomItems = subItem.querySelectorAll('.item');
      for (const bottomItem of bottomItems) {
        const botCate = bottomItem.attrs.title;
        const url = host + bottomItem.attrs.href;
        let count: any = 0;
        // const count = bottomItem
        //   .querySelector('.projects-count')
        //   .firstChild.rawText.trim();

        const countObj = bottomItem.querySelector('.projects-count');
        if (countObj) {
          count = countObj.innerText.replace('(', '').replace(')', '');
        }

        children.push({
          name: botCate,
          count,
          url,
        });
      }
    }

    list.push({
      name: topCate,
      children,
    });
  }

  fs.writeFileSync('ostree.json', JSON.stringify(list));
}

run();
