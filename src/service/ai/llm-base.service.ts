import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeepSeekService } from './deepseek.service';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

/**
 * LLM 调用服务
 *
 * 封装了不同 LLM 提供商（DeepSeek、MiniMax）的调用逻辑，
 * 作为可注入服务（@Injectable）供其他 service 通过依赖注入复用
 * callLLM/callDeepSeek/callMinimax/callMinimaxOpenAi 方法。
 *
 * 通过 llmType 字段切换底层使用的 LLM：'deepseek' | 'minimax' | 'minimax-openai'
 */
@Injectable()
export class LlmBaseService {
  /** 当前使用的 LLM 类型，可通过配置或环境变量动态设置 */
  llmType = 'deepseek'; // 'deepseek' | 'minimax' | 'minimax-openai'

  constructor(
    private readonly configService: ConfigService,
    private readonly deepSeekService: DeepSeekService,
  ) {}

  async callLLM(prompt: string): Promise<string> {
    switch (this.llmType) {
      case 'deepseek':
        return this.callDeepSeek(prompt);
      case 'minimax':
        return this.callMinimax(prompt);
      case 'minimax-openai':
        return this.callMinimaxOpenAi(prompt);
      default:
        throw new Error(`Unsupported LLM type: ${this.llmType}`);
    }
  }

  async callDeepSeek(prompt: string): Promise<string> {
    const resp = await this.deepSeekService.chatWithSystem({
      system: '',
      message: prompt,
      type: 'flash',
    });

    if (typeof resp === 'string') {
      return resp;
    }
    return '';
  }

  async callMinimax(prompt: string): Promise<string> {
    if (!prompt || !prompt.trim()) {
      throw new Error('MiniMax 请求内容为空，已跳过本页');
    }

    const minimaxApiKey = this.configService.get<string>('minimax.apiKey');
    const minimaxModel = this.configService.get<string>('minimax.model');
    const minimaxBaseURL = this.configService.get<string>('minimax.apiUrl');

    const minimaxClient = new Anthropic({
      apiKey: minimaxApiKey,
      baseURL: minimaxBaseURL,
    });

    const resp = await minimaxClient.messages.create({
      model: minimaxModel,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
      thinking: {
        type: 'disabled',
      },
    });

    const messageContent = resp.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!messageContent) {
      throw new Error('MiniMax 返回为空');
    }

    return messageContent;
  }

  async callMinimaxOpenAi(prompt: string): Promise<string> {
    if (!prompt || !prompt.trim()) {
      throw new Error('MiniMax 请求内容为空，已跳过本页');
    }

    const minimaxApiKey = this.configService.get<string>('minimax.apiKey');
    const minimaxModel = this.configService.get<string>('minimax.model');
    const minimaxBaseURL = this.configService.get<string>('minimax.baseApiUrl');

    if (!minimaxApiKey || !minimaxModel || !minimaxBaseURL) {
      throw new Error(
        'MiniMax 配置不完整，请检查 minimax.apiKey/model/baseApiUrl',
      );
    }

    const client = new OpenAI({
      apiKey: minimaxApiKey,
      baseURL: minimaxBaseURL,
    });

    const completion = await client.chat.completions.create({
      model: minimaxModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
    });

    const content: any = completion.choices?.[0]?.message?.content;
    const messageContent =
      typeof content === 'string'
        ? content.trim()
        : Array.isArray(content)
          ? content
              .map((part: any) =>
                typeof part?.text === 'string' ? part.text : '',
              )
              .join('\n')
              .trim()
          : '';

    if (!messageContent) {
      throw new Error('MiniMax 返回为空');
    }

    return messageContent;
  }
}
