import { Body, Controller, Post } from '@nestjs/common';

@Controller('feishu')
export class FeishuController {
  constructor() {}

  @Post('event')
  async event(@Body() payload) {
    console.log(payload);
    return payload;
  }
}
