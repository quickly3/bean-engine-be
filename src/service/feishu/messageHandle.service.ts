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
  aiTools: AiTools;
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
        this.aiModel = AI_MODEL.GPT4;
      }
      if (this.feishu.bean_container_id === chat_id) {
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

  async handleText() {
    this.aiTools = new AiTools(this.configService);
    const chat_id = _.get(this.payload, 'event.message.chat_id');
    const content = _.get(this.payload, 'event.message.content');

    const contentObj = JSON.parse(content);

    const messages = [contentObj.text];
    this.aiTools.setPrompts(this.prompts);
    this.aiTools.setModel(this.aiModel);
    const chatMessage = await this.aiTools.simpleCompl(messages);

    await this.feishu.set_app_access_token();
    await this.feishu.sendMessageToChat({
      message: chatMessage,
      receive_id: chat_id,
    });
  }
}
