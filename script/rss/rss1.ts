import * as htmlparser2 from 'htmlparser2';
import axios from 'axios';

export async function parseRSS(url) {
  try {
    // 设置超时时间（毫秒）
    const timeout = 3000;
    // 使用 axios 发送 GET 请求
    const response = await axios.get(url, {
      timeout,
      proxy: {
        host: '127.0.0.1',
        port: 7890,
        protocol: 'http',
      },
    });
    const text = response.data;

    // 解析 RSS
    const feed = await htmlparser2.parseFeed(text);

    if (feed) {
      return feed.items;
    }
  } catch (error) {
    console.error('RSS 解析错误:', error);
  }
  return [];
}

parseRSS('https://www.reddit.com/r/technology/.rss');
