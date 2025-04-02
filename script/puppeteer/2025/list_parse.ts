import * as cheerio from 'cheerio';
import * as fs from 'fs';

interface Project {
  name: string;
  title: string;
  description: string;
  url: string;
  tags: string[];
  stats: {
    favorites: number;
    comments: number;
    updateTime?: string;
  };
}

function parseHtml(htmlContent: string): Project[] {
  const $ = cheerio.load(htmlContent);
  const projects: Project[] = [];

  $('.article-list .project-item').each((_, element) => {
    const $el = $(element);

    // 跳过推荐作者区块
    if ($el.hasClass('recommend-authors')) {
      return;
    }

    const headerEl = $el.find('h3.header a');
    const nameEl = headerEl.find('.project-name');
    const titleEl = headerEl.find('.project-title');

    const tags: string[] = [];
    headerEl.find('.ui.label').each((_, label) => {
      tags.push($(label).text().trim());
    });

    const statsEl = $el.find('.extra .list');

    const project: Project = {
      name: nameEl.text().trim(),
      title: titleEl
        .text()
        .trim()
        .replace(/^[\s-]+/, '')
        .trim(),
      description: $el.find('.description .line-clamp').text().trim(),
      url: headerEl.attr('href') || '',
      tags: tags,
      stats: {
        favorites:
          parseInt(
            statsEl.find('.item').first().text().replace('收藏', '').trim(),
          ) || 0,
        comments:
          parseInt(statsEl.find('.item a').text().replace('评论', '').trim()) ||
          0,
      },
    };

    const updateTime = statsEl.find('.item.update-time').text().trim();
    if (updateTime) {
      project.stats.updateTime = updateTime.replace('更新于', '').trim();
    }

    projects.push(project);
  });

  return projects;
}

// 读取 HTML 文件
const htmlContent = fs.readFileSync('nlp.html', 'utf-8');
const projects = parseHtml(htmlContent);

// 将结果保存为 JSON 文件
fs.writeFileSync('projects.json', JSON.stringify(projects, null, 2), 'utf-8');

console.log(`Successfully parsed ${projects.length} projects`);
