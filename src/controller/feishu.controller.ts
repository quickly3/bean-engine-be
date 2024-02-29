import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { FeishuRobotService } from 'src/service/feishu/feishuRobot.service';
import { MessageHandleService } from 'src/service/feishu/messageHandle.service';

@Controller('feishu')
export class FeishuController {
  constructor(private readonly feishu: FeishuRobotService) {}

  @Post('event')
  @HttpCode(200)
  async event(@Body() payload) {
    const messageHandleService = new MessageHandleService(this.feishu);
    await messageHandleService.handle(payload);
    return true;
  }
}
