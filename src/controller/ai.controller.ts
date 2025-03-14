import { Body, Controller, Get, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import GeminiAi from 'src/service/ai/Gemini';
import OpenAi from 'src/service/ai/OpenAi';
import { PROMPTS } from 'src/service/feishu/enum';
import * as http from 'http';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL, OPENAI_MODEL } from 'src/service/ai/enum';
import * as fs from 'fs';

@Controller('ai')
export class AiController {
  constructor(private readonly configService: ConfigService) {}

  @Post('openai')
  async openai(@Body() payload) {
    const { GPT_KEY, GPT_PROXY } = this.configService.get('openai');
    const client = new OpenAI({
      apiKey: GPT_KEY,
      baseURL: 'https://api.openai-proxy.com/v1',
      // httpAgent: new HttpsProxyAgent(GPT_PROXY),
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
  async deepseek(@Body() payload) {
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
