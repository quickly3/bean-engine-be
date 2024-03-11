import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_TYPE } from 'src/service/ai/enum';
import { ArticleService } from 'src/service/article.service';
import { MessageHandleService } from 'src/service/feishu/messageHandle.service';

@Controller('feishu')
export class FeishuController {
  constructor(
    private readonly configService: ConfigService,
    private readonly articleService: ArticleService,
  ) {}

  @Post('event/openai')
  @HttpCode(200)
  async event(@Body() payload) {
    try {
      const messageHandleService = new MessageHandleService(
        this.configService,
        this.articleService,
      );
      messageHandleService.setAiType(AI_TYPE.OPENAI);
      messageHandleService.handle(payload);
    } catch (error) {
      console.error(error);
    }
    return true;
  }

  @Post('event/gemini')
  @HttpCode(200)
  async eventGemini(@Body() payload) {
    try {
      const messageHandleService = new MessageHandleService(
        this.configService,
        this.articleService,
      );

      messageHandleService.setAiType(AI_TYPE.GEMINI);
      messageHandleService.handle(payload);
    } catch (error) {
      console.error(error);
    }
    return true;
  }
}
