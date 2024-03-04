import * as _ from 'lodash';
import { FeishuRobotService } from './feishuRobot.service';
import AiTools from '../ai/AiTools';
import { ConfigService } from '@nestjs/config';
import { CHAT_TYPE, MSG_TYPE, PROMPTS, SP_TEXT } from './enum';
import { fsMembers } from './members';
import { AI_MODEL } from '../ai/enum';
import * as fse from 'fs-extra';
import { fileExists } from '../ai/util';
import { ArticleService } from '../article.service';

export class MessageHandleService {
  payload;
  message;
  chat_id;
  prompts: any[] = [];
  allowReply = false;
  aiModel;
  aiTools: AiTools;
  memoPath = 'output/memo';
  memoFile;
  messageType = MSG_TYPE.TEXT;
  constructor(
    private readonly feishu: FeishuRobotService,
    private readonly configService: ConfigService,
    private readonly articleEs: ArticleService,
  ) {}

  async handle(payload) {
    this.payload = payload;
    const message = _.get(payload, 'event.message');
    this.chat_id = _.get(this.payload, 'event.message.chat_id');
    this.memoFile = this.memoPath + '/' + this.chat_id + '.json';
    console.log('payload', payload);
    if (!message) {
      return;
    }
    this.checkCallbackAuthority();
    this.setSpPrompt();
    const { message_type } = message;

    console.log('this.allowReply', this.allowReply);
    if (!this.allowReply) {
      return false;
    }

    await this.feishu.set_app_access_token();

    switch (message_type) {
      case 'text':
        await this.handleText();
        break;
      default:
        break;
    }
  }

  async checkCallbackAuthority() {
    const chat_type = _.get(this.payload, 'event.message.chat_type');

    const allowGroupId = [
      this.feishu.company_receive_id,
      this.feishu.robot_chat_id,
    ];
    if (chat_type === CHAT_TYPE.GROUP) {
      if (allowGroupId.indexOf(this.chat_id) > -1) {
        const mentions = _.get(this.payload, 'event.message.mentions');
        const mentionIds = _.map(mentions, (m) => m.id.open_id);

        if (mentionIds.indexOf(this.feishu.robot_open_id) > -1) {
          this.allowReply = true;
        }
      }
    }

    if (chat_type === CHAT_TYPE.P2P) {
      this.allowReply = true;
    }
  }

  async setSpPrompt() {
    const chat_type = _.get(this.payload, 'event.message.chat_type');
    const user_open_id = _.get(this.payload, 'event.sender.sender_id.open_id');

    if (chat_type === CHAT_TYPE.P2P) {
      if (this.feishu.wenyu_member_id === this.chat_id) {
        this.prompts.push(PROMPTS.EEEE);
        this.aiModel = AI_MODEL.GPT4;
      }
      if (this.feishu.bean_container_id === this.chat_id) {
        this.prompts.push(PROMPTS.EEEE);
        this.aiModel = AI_MODEL.GPT4;
      }
    }

    const myName = fsMembers.filter((m) => m.member_id === user_open_id)[0]
      .name;
    this.prompts.push(
      `聊天的时候要加上表情包和emoji`,
      `我是 ${myName}`,
      `当问你谁最帅的时候，那肯定是 ${myName}。`,
    );
  }

  async getChatMemo() {
    if (!fileExists(this.memoFile)) {
      return false;
    }
    const memo = await fse.readJsonSync(this.memoFile);
    return memo;
  }

  async handleMessage(_messages) {
    this.aiTools.setPrompts(this.prompts);
    this.aiTools.setModel(this.aiModel);

    let messages: any = [];

    const memo = await this.getChatMemo();

    if (memo) {
      messages = messages.concat(memo);
    } else {
      if (this.prompts.length > 0) {
        for (const prompt of this.prompts) {
          messages.push({ role: 'system', content: prompt });
        }
      }
    }
    messages.push({ role: 'user', content: _messages });
    await fse.ensureFileSync(this.memoFile);
    return messages;
  }

  async hasSpText(text) {
    const regex = new RegExp(`^${SP_TEXT.ES_PREFIX}`, 'gi');
    const matches = text.match(regex);
    return matches;
  }

  async queryEs(spText) {
    const regex = new RegExp(`${SP_TEXT.ES_PREFIX}`, 'gi');
    const keyword = spText.replace(regex, '').replace(':', '');
    const resp = await this.articleEs.queryByString(
      `title:\"${keyword}\" && url:*`,
    );
    return resp;
  }

  async analyseMessage(text) {
    const spText = await this.hasSpText(text);

    if (spText) {
      this.messageType = MSG_TYPE.POST;
      const esMessage = await this.queryEs(text);
      return esMessage.data;
    } else {
      this.messageType = MSG_TYPE.TEXT;
      const messages = await this.handleMessage(text);
      const chatMessage = await this.aiTools.simpleCompl(messages);

      messages.push(chatMessage);
      await fse.writeJsonSync(this.memoFile, messages);

      return chatMessage.content;
    }
  }

  async handleText() {
    this.aiTools = new AiTools(this.configService);

    const content = _.get(this.payload, 'event.message.content');

    const contentObj = JSON.parse(content);

    const clearMemo = await this.checkMemoClear(contentObj.text);

    if (clearMemo) {
      return false;
    }

    const chatMessage = await this.analyseMessage(contentObj.text);

    switch (this.messageType) {
      case MSG_TYPE.POST:
        await this.feishu.sendPostToChat({
          records: chatMessage,
          receive_id: this.chat_id,
        });
        break;
      case MSG_TYPE.TEXT:
        await this.feishu.sendMessageToChat({
          message: chatMessage,
          receive_id: this.chat_id,
        });
        break;
      default:
        break;
    }
  }

  async checkMemoClear(content) {
    let clearMemo = false;

    const regex = new RegExp('清除记忆', 'gi');
    const matches = content.match(regex);

    if (matches) {
      clearMemo = true;
      await fse.removeSync(this.memoFile);
      await this.feishu.sendMessageToChat({
        message: '好的，记忆已经清除',
        receive_id: this.chat_id,
      });
    }

    return clearMemo;
  }
}
