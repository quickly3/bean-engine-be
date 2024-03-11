import * as _ from 'lodash';
import { FeishuRobotService } from './feishuRobot.service';
import OpenAi from '../ai/OpenAi';
import { ConfigService } from '@nestjs/config';
import { CHAT_TYPE, MSG_TYPE, PROMPTS, SP_TEXT } from './enum';
import { AI_TYPE, OPENAI_MODEL } from '../ai/enum';
import * as fse from 'fs-extra';
import { fileExists } from '../ai/util';
import { ArticleService } from '../article.service';
import GeminiAi from '../ai/Gemini';

export class MessageHandleService {
  payload;
  message;
  chat_id;
  prompts: any[] = [];
  allowReply = false;
  aiTools: any;
  memoPath = 'output/memo';
  memoFile;
  aiType = AI_TYPE.OPENAI;
  messageType = MSG_TYPE.TEXT;
  constructor(
    private readonly feishu: FeishuRobotService,
    private readonly configService: ConfigService,
    private readonly articleEs: ArticleService,
  ) {}

  setAiType(aiType) {
    this.aiType = aiType;
  }

  async handle(payload) {
    this.payload = payload;
    const message = _.get(payload, 'event.message');
    this.chat_id = _.get(this.payload, 'event.message.chat_id');
    const memoDir = this.memoPath + `/${this.aiType}/`;
    fse.ensureDir(memoDir);
    this.memoFile = memoDir + this.chat_id + '.json';
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

    let feishuId = 'feishu';
    if (this.aiType === AI_TYPE.GEMINI) {
      feishuId = 'feishu2';
    }
    await this.feishu.set_app_access_token(feishuId);

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

        console.log(this.feishu.robot_union_id);
        console.log(mentions);

        if (mentionIds.indexOf(this.feishu.robot_union_id) > -1) {
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
    // const user_open_id = _.get(this.payload, 'event.sender.sender_id.open_id');

    if (chat_type === CHAT_TYPE.P2P) {
      if (this.feishu.wenyu_member_id === this.chat_id) {
        this.prompts.push(PROMPTS.SSGF);
      }
      if (this.feishu.bean_container_id === this.chat_id) {
        // this.prompts.push(PROMPTSE);
      }
    }

    if (this.aiType === AI_TYPE.OPENAI) {
      this.prompts.push(PROMPTS.DUNDUN);
    } else {
      this.prompts.push(PROMPTS.GEMINI);
    }
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
    // await fse.ensureFileSync(this.memoFile);
    return messages;
  }

  async hasSpText(text) {
    const regex = new RegExp(`^.*${SP_TEXT.ES_PREFIX}`, 'gi');
    const matches = text.match(regex);
    return matches;
  }

  async queryEs(spText) {
    const regex = new RegExp(`.*${SP_TEXT.ES_PREFIX}`, 'gi');
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

      try {
        const chatMessage = await this.aiTools.simpleCompl(messages);
        messages.push(chatMessage);
        await fse.writeJsonSync(this.memoFile, messages);

        return chatMessage.content;
      } catch (error) {
        console.error(error);
        return '对话发生错误';
      }
    }
  }

  async handleText() {
    if (this.aiType === AI_TYPE.OPENAI) {
      this.aiTools = new OpenAi(this.configService);
    }

    if (this.aiType === AI_TYPE.GEMINI) {
      this.aiTools = new GeminiAi(this.configService);
    }

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
