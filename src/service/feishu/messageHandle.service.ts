import * as _ from 'lodash';
import { FeishuRobotService } from './feishuRobot.service';
import AiTools from '../ai/AiTools';
import { ConfigService } from '@nestjs/config';

export class MessageHandleService {
  message;

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

    const { message_type, chat_id } = message;
    this.message = message;

    if (this.feishu.bean_container_id !== chat_id) {
      return;
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
    console.log(messages);

    const chatMessage = await aiTools.simpleCompl(messages);

    console.log(chatMessage);

    await this.feishu.set_app_access_token();
    await this.feishu.sendMessageToChat({
      message: chatMessage,
      receive_id: chat_id,
    });
  }
}
