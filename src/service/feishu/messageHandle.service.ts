import * as _ from 'lodash';
import { FeishuRobotService } from './feishuRobot.service';
import AiTools from '../ai/AiTools';
import { ConfigService } from '@nestjs/config';
import { CHAT_TYPE, PROMPTS } from './enum';
import { fsMembers } from './members';
import { AI_MODEL } from '../ai/enum';

export class MessageHandleService {
  payload;
  message;
  prompts: any[] = [];
  allowReply = false;
  aiModel;
  constructor(
    private readonly feishu: FeishuRobotService,
    private readonly configService: ConfigService,
  ) {}

  async handle(payload) {
    const message = _.get(payload, 'event.message');

    console.log('payload', payload);
    if (!message) {
      return;
    }
    this.payload = payload;
    this.checkCallbackAuthority();
    this.setSpPrompt();
    const { message_type } = message;

    console.log('this.allowReply', this.allowReply);
    if (!this.allowReply) {
      return false;
    }

    switch (message_type) {
      case 'text':
        await this.handleText();
        break;
      default:
        break;
    }
  }

  async checkCallbackAuthority() {
    const chat_id = _.get(this.payload, 'event.message.chat_id');
    const chat_type = _.get(this.payload, 'event.message.chat_type');

    const allowGroupId = [
      this.feishu.company_receive_id,
      this.feishu.robot_group_id,
    ];
    if (chat_type === CHAT_TYPE.GROUP) {
      if (allowGroupId.indexOf(chat_id) > -1) {
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
    const chat_id = _.get(this.payload, 'event.message.chat_id');
    const chat_type = _.get(this.payload, 'event.message.chat_type');
    const user_open_id = _.get(this.payload, 'event.sender.sender_id.open_id');

    if (chat_type === CHAT_TYPE.P2P) {
      if (this.feishu.wenyu_member_id === chat_id) {
        this.prompts.push(PROMPTS.EEEE);
        this.aiModel = AI_MODEL.GPT3;
      }
      if (this.feishu.bean_container_id === chat_id) {
        this.prompts.push(PROMPTS.EEEE);
        this.aiModel = AI_MODEL.GPT3;
      }
    }

    const fsMemberNames = fsMembers.map((m) => m.name).join(',');
    const myName = fsMembers.filter((m) => m.member_id === user_open_id)[0]
      .name;
    this.prompts.push(
      `聊天的时候要加上表情包`,
      `我是 ${myName}`,
      `你在一个群里面这个群里面有以下这些大佬: ${fsMemberNames}`,
      `当问你谁最帅的时候，那肯定是 ${myName}。`,
    );
  }

  async handleText() {
    const chat_id = _.get(this.payload, 'event.message.chat_id');
    const content = _.get(this.payload, 'event.message.content');

    const contentObj = JSON.parse(content);
    const aiTools = new AiTools(this.configService);
    const messages = [contentObj.text];
    aiTools.setPrompts(this.prompts);
    aiTools.setModel(this.aiModel);
    const chatMessage = await aiTools.simpleCompl(messages);

    await this.feishu.set_app_access_token();
    await this.feishu.sendMessageToChat({
      message: chatMessage,
      receive_id: chat_id,
    });
  }
}
