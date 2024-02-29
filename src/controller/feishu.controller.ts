import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeishuRobotService } from 'src/service/feishu/feishuRobot.service';
import { MessageHandleService } from 'src/service/feishu/messageHandle.service';

@Controller('feishu')
export class FeishuController {
  constructor(
    private readonly feishu: FeishuRobotService,
    private readonly configService: ConfigService,
  ) {}

  @Post('event')
  @HttpCode(200)
  async event(@Body() payload) {
    try {
      const messageHandleService = new MessageHandleService(
        this.feishu,
        this.configService,
      );
      messageHandleService.handle(payload);
    } catch (error) {
      console.error(error);
    }
    return true;
  }
}
