import { Body, Controller, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL, OPENAI_MODEL } from 'src/service/ai/enum';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly configService: ConfigService) {}

  @Post('openai')
  @ApiOperation({ summary: '调用 OpenAI 聊天接口' })
  @ApiBody({
    description: 'OpenAI 请求参数',
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: '提示词内容' },
        session_id: { type: 'string', description: '会话 ID' },
      },
      required: ['content'],
    },
  })
  @ApiOkResponse({ description: 'OpenAI 返回结果' })
  async openai(@Body() payload) {
    const { GPT_KEY, OPENAI_PROXY_URL } = this.configService.get('openai');
    const client = new OpenAI({
      apiKey: GPT_KEY,
      baseURL: OPENAI_PROXY_URL,
    });

    const compOption: any = {
      messages: [{ role: 'system', content: payload.content }],
      model: OPENAI_MODEL.GPT4,
    };

    if (payload.session_id) {
      compOption.session_id = payload.session_id;
    }

    const completion = await client.chat.completions.create(compOption);

    return completion;
  }

  @Post('deepseek')
  @ApiOperation({ summary: '调用 DeepSeek 聊天接口' })
  @ApiOkResponse({ description: 'DeepSeek 返回结果' })
  async deepseek() {
    const { DS_KEY } = this.configService.get('deepseek');
    const openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: DS_KEY,
    });
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'system', content: 'You are a helpful assistant.' }],
      model: 'deepseek-chat',
    });
    return completion;
  }

  @Post('gemini')
  @ApiOperation({ summary: '调用 Gemini 聊天接口' })
  @ApiBody({
    description: 'Gemini 请求参数',
    schema: {
      type: 'object',
      properties: {
        content: {
          oneOf: [
            { type: 'string', description: '提示词文本' },
            {
              type: 'object',
              properties: {
                content: { type: 'string', description: '消息内容' },
              },
            },
          ],
        },
      },
      required: ['content'],
    },
  })
  @ApiOkResponse({ description: 'Gemini 返回结果' })
  async gemini(@Body() payload) {
    const geminiKey = this.configService.get('google.geminiKey');
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL.GEMINI_PRO });

    const message = [payload.content];

    const prompts = message.map((p) => p.content);
    const result = await model.generateContent(prompts);
    return {
      role: 'assistant',
      content: result.response.text(),
    };
  }
}
