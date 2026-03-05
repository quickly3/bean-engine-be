import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AI_TYPE } from 'src/service/ai/enum';
import { ArticleService } from 'src/service/article.service';
import { MessageHandleService } from 'src/service/feishu/messageHandle.service';

@ApiTags('feishu')
@Controller('feishu')
export class FeishuController {
  constructor(
    private readonly configService: ConfigService,
    private readonly articleService: ArticleService,
  ) {}

  @Post('event/openai')
  @HttpCode(200)
  @ApiOperation({ summary: '接收飞书 OpenAI 事件回调' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  @ApiOkResponse({ description: '处理成功返回 true' })
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
  @ApiOperation({ summary: '接收飞书 Gemini 事件回调' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  @ApiOkResponse({ description: '处理成功返回 true' })
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
