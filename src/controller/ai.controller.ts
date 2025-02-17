import { Body, Controller, Get, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import GeminiAi from 'src/service/ai/Gemini';
import OpenAi from 'src/service/ai/OpenAi';
import { PROMPTS } from 'src/service/feishu/enum';

@Controller('ai')
export class AiController {
  constructor(private readonly configService: ConfigService) {}

  @Post('openai')
  async openai(@Body() payload) {
    const aiTools = new OpenAi(this.configService);

    const titles = [payload.content];

    const titles_string = JSON.stringify(titles);

    aiTools.setPrompts([PROMPTS.TRANSLATE]);
    const resp = await aiTools.simpleComplSimple(titles_string);
    return resp;
  }

  @Post('gemini')
  async gemini(@Body() payload) {
    const messages = [payload.content];
    const genAi = new GeminiAi(this.configService);
    return await genAi.simpleCompl(messages);
  }
}
