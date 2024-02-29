import { Body, Controller, HttpCode, Post } from '@nestjs/common';

@Controller('feishu')
export class FeishuController {
  constructor() {}

  @Post('event')
  @HttpCode(200)
  async event(@Body() payload) {
    console.log('payload', payload);
    return true;
  }
}
