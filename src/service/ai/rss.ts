import * as htmlparser2 from 'htmlparser2';
import axios from 'axios';

export async function parseRSS(url, useProxy = true) {
  try {
    // 设置超时时间（毫秒）
    const timeout = 3000;

    const options: any = {
      timeout,
    };

    if (useProxy) {
      options.proxy = {
        host: '127.0.0.1',
        port: 7890,
        protocol: 'http',
      };
    }

    const response = await axios.get(url, options);
    const text = response.data;

    // 解析 RSS
    const feed = await htmlparser2.parseFeed(text);

    if (feed) {
      return feed.items;
    }
  } catch (error) {
    console.error('RSS 请求错误:', url);
  }
  return [];
}
