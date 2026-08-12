import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as _ from 'lodash';
import { getSourceName } from '../utils';

export class FeishuRobot {
  headers: any;
  app_id: string;
  app_secret: string;
  app_access_token: string;
  bean_container_id = 'oc_ecdb5d055abbc0aa5bf91c1d4a77e1b1';
  bean_receive_id = 'ou_7ba56fd9ecc84f4115ba863607f3d898';
  wenyu_member_id = 'ou_cda6a2e844dca261b72be3ac48f6ade1';
  tan_member_id = 'ou_efdd5450b63b99c9c3893b38469a0093';
  company_receive_id = 'oc_59384feeb3ab194bdc0f9f385da7354f';
  robot_open_id = 'ou_2d40378899416ae73ca59fb16c63d3f6';
  robot_union_id;

  allowGroupIds = [
    'oc_ffb345b685885b5c96a90e77f0dde6d3',
    'oc_59384feeb3ab194bdc0f9f385da7354f',
    'oc_a4ef85d69e23d5f48bc9885aeb2334e5',
  ];

  constructor(private readonly configService: ConfigService) {}

  async set_app_access_token(id = 'feishu') {
    this.app_id = this.configService.get(`${id}.FS_APP_ID`);
    this.app_secret = this.configService.get(`${id}.FS_APP_SECRET`);
    this.robot_union_id = this.configService.get(`${id}.FS_ROBOT_UNION_ID`);

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

      this.headers = {
        Authorization: `Bearer ${this.app_access_token}`,
      };
    } catch (error) {
      console.error(error.response.data);
    }
  }

  async getChatgroupList() {
    try {
      const response = await axios({
        method: 'get',
        url: 'https://open.feishu.cn/open-apis/im/v1/chats',
        headers: this.headers,
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
        headers: this.headers,
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
        headers: this.headers,
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
        headers: this.headers,
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
        headers: this.headers,
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
        headers: this.headers,
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
        headers: this.headers,
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
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      console.error(error.response.data);
    }
  }

  /**
   * 获取公司群（sendToCompanyPost 发送的目标群）最近的消息列表
   * @param pageSize 查询条数，默认 5
   * @param options 可选参数
   * @param options.startTime 起始时间（毫秒时间戳），用于读取该时间之后的最新数据
   * @param options.endTime 结束时间（毫秒时间戳）
   */
  async getCompanyMessageList(pageSize = 5) {
    try {
      const params = {
        container_id_type: 'chat',
        container_id: this.company_receive_id,
        page_size: pageSize,
        sort_type: 'ByCreateTimeDesc',
        // ...(startTime ? { start_time: startTime } : {}),
        // ...(endTime ? { end_time: endTime } : {}),
      };

      const response = await axios({
        method: 'get',
        url: 'https://open.feishu.cn/open-apis/im/v1/messages',
        params,
        headers: this.headers,
      });
      return response.data.data.items;
    } catch (error) {
      console.error(error.response?.data);
    }
  }

  /**
   * 获取指定消息的已读用户列表
   * @param messageId 消息 ID
   */
  async getMessageReadUsers(messageId: string) {
    try {
      const response = await axios({
        method: 'get',
        url: `https://open.feishu.cn/open-apis/im/v1/messages/${messageId}/read_users`,
        params: {
          page_size: 100,
          user_id_type: 'open_id',
        },
        headers: this.headers,
      });
      return response.data.data;
    } catch (error) {
      console.error(error.response?.data.error);
    }
  }

  /**
   * 根据 open_id 列表查询用户名字
   * @param userIds open_id 列表
   */
  async getUserNames(userIds: string[]) {
    const names = [];
    for (const userId of userIds) {
      try {
        const response = await axios({
          method: 'get',
          url: `https://open.feishu.cn/open-apis/contact/v3/users/${userId}`,
          params: { user_id_type: 'open_id' },
          headers: this.headers,
        });
        names.push(response.data.data.user.name);
      } catch (error) {
        console.error(error.response?.data);
        names.push(userId);
      }
    }
    return names;
  }

  /**
   * 查询发送到公司群的最近几条消息的已读情况
   * @param pageSize 查询最近消息条数，默认 5
   */
  async getCompanyPostReadStatus(pageSize = 1) {
    const items = await this.getCompanyMessageList(pageSize);
    if (!items) return [];

    const result = [];
    for (const item of items) {
      const readData = await this.getMessageReadUsers(item.message_id);
      const readUsers = readData?.items ?? [];

      const content = JSON.parse(item.body.content);
      const title = content.title;

      const user_ids = readUsers.map((user) => user.user_id);
      const user_names = await this.getUserNames(user_ids);

      result.push({
        // message_id: item.message_id,
        // msg_type: item.msg_type,
        // create_time: item.create_time,
        // sender: item.sender,
        title,
        // read_count: readUsers.length,
        // read_users: readUsers,
        user_names,
      });
    }
    return result;
  }

  toFeishuMdFormat(title, mdContent) {
    const postContent = {
      zh_cn: {
        title: title,
        content: [[{ tag: 'md', text: mdContent }]],
      },
    };
    return postContent;
  }
}
