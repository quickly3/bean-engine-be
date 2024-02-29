import { Controller, Post } from '@nestjs/common';

@Controller('feishu')
export class FeishuController {
  constructor() {}

  @Post('event')
  async event() {
    console.log('event');
    return true;
  }
}
