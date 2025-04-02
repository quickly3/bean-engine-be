import * as fs from 'fs';
import * as cheerio from 'cheerio';

interface Subcategory {
  name: string;
  url: string;
  count: number;
  level: number;
}

interface Category {
  name: string;
  level: number;
  subcategories: Subcategory[];
}

const domain = 'https://www.oschina.net';

function parseCategoryMenu(html: string): Category[] {
  const $ = cheerio.load(html);
  const categories: Category[] = [];

  // 遍历顶级分类
  $('#projectCategoryMenu > .dropdown.item').each((i, elem) => {
    const category: Category = {
      name: $(elem).clone().children().remove().end().text().trim(),
      level: 1,
      subcategories: [],
    };

    // 遍历子分类
    $(elem)
      .find('.column .ui.list .item')
      .each((j, item) => {
        const $item = $(item);
        const href = $item.attr('href') || '';
        const title = $item.attr('title') || $item.text().trim();
        const count = $item.find('.projects-count').text();

        // 计算分类层级
        const level = $item.parents('.ui.list').length + 1;

        // 提取项目数量
        const countMatch = count ? count.match(/\((\d+)\)/) : null;
        const projectCount = countMatch ? parseInt(countMatch[1], 10) : 0;

        category.subcategories.push({
          name: title,
          url: domain + href,
          count: projectCount,
          level: level,
        });
      });

    categories.push(category);
  });

  return categories;
}

try {
  // 读取HTML文件
  const html = fs.readFileSync('./cate.html', 'utf8');

  // 解析分类数据
  const categories = parseCategoryMenu(html);

  // 保存为JSON文件
  const jsonOutput = JSON.stringify(categories, null, 2);
  fs.writeFileSync('./categories.json', jsonOutput);

  console.log('分类数据已成功解析并保存到 categories.json');
} catch (error) {
  console.error('解析过程中发生错误:', error);
}
