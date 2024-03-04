import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as _ from 'lodash';
import { getSourceName } from '../utils';

@Injectable()
export class FeishuRobotService {
  app_id: string;
  app_secret: string;
  app_access_token: string;
  bean_container_id = 'oc_ecdb5d055abbc0aa5bf91c1d4a77e1b1';
  bean_receive_id = 'ou_7ba56fd9ecc84f4115ba863607f3d898';
  wenyu_member_id = 'ou_cda6a2e844dca261b72be3ac48f6ade1';
  tan_member_id = 'ou_efdd5450b63b99c9c3893b38469a0093';
  company_receive_id = 'oc_59384feeb3ab194bdc0f9f385da7354f';
  // robot_group_id = 'oc_59384feeb3ab194bdc0f9f385da7354f';
  robot_chat_id = 'oc_ffb345b685885b5c96a90e77f0dde6d3';
  robot_open_id = 'ou_2d40378899416ae73ca59fb16c63d3f6';

  constructor(private readonly configService: ConfigService) {
    this.app_id = this.configService.get('feishu.FS_APP_ID');
    this.app_secret = this.configService.get('feishu.FS_APP_SECRET');
  }

  async set_app_access_token() {
    const body = {
      app_id: this.app_id,
      app_secret: this.app_secret,
    };
    const url =
      'https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal/';

    try {
      const response = await axios({
        method: 'post',
        url,
        data: body,
      });
      this.app_access_token = _.get(response, 'data.app_access_token');
      axios.defaults.headers.common[
        'Authorization'
      ] = `Bearer ${this.app_access_token}`;
    } catch (error) {}
  }

  async getChatgroupList() {
    try {
      const response = await axios({
        method: 'get',
        url: 'https://open.feishu.cn/open-apis/im/v1/chats',
      });
      return response.data.data.items;
    } catch (error) {
      console.error(error.response.data);
    }
  }

  async getGroupMembers(chat_id) {
    try {
      const response = await axios({
        method: 'get',
        url: `https://open.feishu.cn/open-apis/im/v1/chats/${chat_id}/members`,
      });
      return response.data.data;
    } catch (error) {
      console.error(error.response.data);
    }
  }

  async getMessageList() {
    try {
      const response = await axios({
        method: 'get',
        url: 'https://open.feishu.cn/open-apis/im/v1/messages',
        params: {
          container_id_type: 'chat',
          container_id: this.bean_container_id,
          page_size: 5,
        },
      });
      return response.data.data.items;
    } catch (error) {
      console.error(error.response.data.error);
    }
  }

  async sendMessageToChat(params: { message: string; receive_id: string }) {
    const { message, receive_id } = params;

    const data = {
      receive_id,
      msg_type: 'text',
      content: JSON.stringify({
        text: message,
      }),
    };
    try {
      const response = await axios({
        method: 'post',
        url: 'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id',
        data,
      });
      return response.data;
    } catch (error) {
      console.error(error.response.data);
    }
  }

  async sendPostToChat(params: { records; receive_id: string }) {
    const content: any = [];
    const { records, receive_id } = params;

    for (const i in records) {
      const r = records[i];

      const source = getSourceName(r.source);

      content.push([
        {
          tag: 'a',
          href: r.url,
          text: `${parseInt(i) + 1}.${r.title} (${source})`,
        },
      ]);
      content.push([{ tag: 'text', text: r.summary }]);
    }
    const postContent = {
      zh_cn: {
        title: `以下是搜索结果：`,
        content,
      },
    };
    const data = {
      receive_id,
      msg_type: 'post',
      content: JSON.stringify(postContent),
    };

    try {
      const response = await axios({
        method: 'post',
        url: 'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id',
        data,
      });
      return response.data;
    } catch (error) {
      console.error(error.response.data);
    }
  }

  async sendToBean(message) {
    const receive_id = this.bean_receive_id;

    const data = {
      receive_id,
      msg_type: 'text',
      content: JSON.stringify({
        text: message,
      }),
    };

    try {
      const response = await axios({
        method: 'post',
        url: 'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id',
        data,
      });
      return response.data;
    } catch (error) {
      console.error(error.response.data);
    }
  }

  async sendToBeanPost(content) {
    const receive_id = this.bean_receive_id;

    const data = {
      receive_id,
      msg_type: 'post',
      content: JSON.stringify(content),
    };
    try {
      const response = await axios({
        method: 'post',
        url: 'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id',
        data,
      });
      return response.data;
    } catch (error) {
      console.error(error.response.data);
    }
  }

  async sendToCompanyPost(content) {
    const receive_id = this.company_receive_id;
    const data = {
      receive_id,
      msg_type: 'post',
      content: JSON.stringify(content),
    };
    try {
      const response = await axios({
        method: 'post',
        url: 'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id',
        data,
      });
      return response.data;
    } catch (error) {
      console.error(error.response.data);
    }
  }
}
