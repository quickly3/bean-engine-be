import { Injectable } from '@nestjs/common';
import * as _ from 'lodash';
import axios from 'axios';
import * as moment from 'moment';

@Injectable()
export class HackerNewsService {
  headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36',
    Accept: '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    Connection: 'keep-alive',
  };
  async getItem(id) {
    try {
      const url = `https://hacker-news.firebaseio.com/v0/item/${id}.json?print=pretty`;
      console.log(url);

      const response = await axios.get(url, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      console.log(error);
    }
  }

  async getTopStories() {
    try {
      const url =
        'https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty';

      // const url = 'https://www.baidu.com';

      const response = await axios.get(url, {
        headers: this.headers,
      });

      return response.data;
    } catch (error) {}
  }

  async getTopStoriesParsed() {
    const ids = await this.getTopStories();

    const stories = [];
    const titles = [];
    for (const id of ids) {
      const resp = await this.getItem(id);
      const item = {
        title: resp.title,
        url: resp.url,
        time: moment(parseInt(`${resp.time}000`)).format('YYYY-MM-DD'),
      };
      console.log(item);
      titles.push(resp.title);
      stories.push(item);
    }
  }
}
