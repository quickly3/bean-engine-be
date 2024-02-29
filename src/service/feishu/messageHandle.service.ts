import * as _ from 'lodash';
import { FeishuRobotService } from './feishuRobot.service';

export class MessageHandleService {
  message;

  constructor(private readonly feishu: FeishuRobotService) {}

  async handle(payload) {
    const message = _.get(payload, 'event.message');

    if (!message) {
      return;
    }

    const { message_type } = message;

    this.message = message;

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
    await this.feishu.sendMessage({
      message: contentObj.text,
      receive_id: chat_id,
    });
  }
}
