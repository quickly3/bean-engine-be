import { Injectable } from '@nestjs/common';
import * as _ from 'lodash';
import axios from 'axios';
import * as moment from 'moment';
import OpenAi from './ai/OpenAi';
import { PROMPTS } from './feishu/enum';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HackerNewsService {
  constructor(private readonly configService: ConfigService) {}
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

  async getNewStories() {
    try {
      const url =
        'https://hacker-news.firebaseio.com/v0/newstories.json?print=pretty';

      // const url = 'https://www.baidu.com';

      const response = await axios.get(url, {
        headers: this.headers,
      });

      return response.data;
    } catch (error) {
      console.log(error);
    }
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
      titles.push(resp.title);
      stories.push(item);
    }
  }

  async getNewStoriesParsed() {
    const ids = await this.getNewStories();

    const stories = [];
    const titles = [];

    const ids_chunk = _.chunk(ids, 10);
    for (const id of ids_chunk[0]) {
      console.log(id);
      const resp = await this.getItem(id);
      const item = {
        title: resp.title,
        url: resp.url,
        time: moment(parseInt(`${resp.time}000`)).format('YYYY-MM-DD'),
      };
      titles.push(resp.title);
      stories.push(item);
    }

    const titles_cn = await this.gptTrans(titles);

    for (const i in stories) {
      stories[i].title_cn = titles_cn[i];
    }
    console.log(stories);
  }

  async gptTrans(titles) {
    const aiTools = new OpenAi(this.configService);

    const titles_string = JSON.stringify(titles);

    aiTools.setPrompts([PROMPTS.TRANSLATE]);
    const resp = await aiTools.simpleComplSimple(titles_string);
    console.log(resp);
    return JSON.parse(resp.content);
  }
}
