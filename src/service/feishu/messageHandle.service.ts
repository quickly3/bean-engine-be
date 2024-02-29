import * as _ from 'lodash';
import { FeishuRobotService } from './feishuRobot.service';

export class MessageHandleService {
  message;

  constructor(private readonly feishu: FeishuRobotService) {}

  async handle(payload) {
    console.log('payload', payload);

    const message = _.get(payload, 'event.message');

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

    await this.feishu.set_app_access_token();
    await this.feishu.sendMessageToChat({
      message: contentObj.text,
      receive_id: chat_id,
    });
  }
}
