import * as _ from 'lodash';
import { FeishuRobotService } from './feishuRobot.service';
import AiTools from '../ai/AiTools';
import { ConfigService } from '@nestjs/config';
import { PROMPTS } from './enum';

export class MessageHandleService {
  message;
  prompt;
  constructor(
    private readonly feishu: FeishuRobotService,
    private readonly configService: ConfigService,
  ) {}

  async handle(payload) {
    const message = _.get(payload, 'event.message');

    console.log('payload', payload);

    console.log(payload.event.message.mentions);

    if (!message) {
      return;
    }

    const { message_type, chat_id } = message;
    this.message = message;

    let allowReply = false;
    if (this.feishu.bean_container_id === chat_id) {
      this.prompt = PROMPTS.SSGF;
      allowReply = true;
    }
    if (this.feishu.wenyu_member_id === chat_id) {
      this.prompt = PROMPTS.SSGF;
      allowReply = true;
    }

    if (this.feishu.company_receive_id === chat_id) {
      const mentions = _.get(payload, 'event.message.mentions');
      const mentionIds = _.map(mentions, (m) => m.id.open_id);

      if (mentionIds.indexOf(this.feishu.robot_open_id) > -1) {
        allowReply = true;
      }
    }

    if (!allowReply) {
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

  async handleText() {
    const { chat_id, content } = this.message;

    const contentObj = JSON.parse(content);
    const aiTools = new AiTools(this.configService);

    const messages = [contentObj.text];
    const chatMessage = await aiTools.simpleCompl(messages, this.prompt);

    await this.feishu.set_app_access_token();
    await this.feishu.sendMessageToChat({
      message: chatMessage,
      receive_id: chat_id,
    });
  }
}
