import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import axios from 'axios';
import _ from 'lodash';
import {
  DeepSeekSearchOptions,
  DeepSeekSearchResponse,
  DeepSeekFetchOptions,
  DeepSeekFetchResponse,
} from './ds.interface';

const modelMap = {
  flash: 'deepseek-v4-flash',
  pro: 'deepseek-v4-pro',
};
@Injectable()
export class DeepSeekService {
  public openai: OpenAI;
  constructor(private readonly configService: ConfigService) {
    const dsKey = this.configService.get<string>('deepseek.DS_KEY');
    const dsUrl = this.configService.get<string>('deepseek.DS_URL');

    this.openai = new OpenAI({
      baseURL: dsUrl,
      apiKey: dsKey,
    });
  }

  async completion(options) {
    const { message, type } = options;

    const model = type ? modelMap[type] : modelMap.flash;

    const messages: any = [
      {
        role: 'user',
        content: message,
      },
    ];

    return await this.openai.chat.completions.create({
      messages,
      model,
      reasoning_effort: 'high',
      stream: false,
    });
  }

  async chat(options) {
    const resp = await this.completion(options);
    return _.get(resp, 'choices[0].message.content', '');
  }

  /**
   * 支持 system prompt 的对话方法。
   * @param options.system - 系统提示词
   * @param options.message - 用户消息
   * @param options.type - 模型类型（flash / pro）
   */
  async chatWithSystem(options: {
    system: string;
    message: string;
    type?: 'flash' | 'pro';
    thinking?: { type: 'disabled' | 'enabled' };
  }): Promise<string> {
    const { system, message, type, thinking } = options;

    const model = type ? modelMap[type] : modelMap.flash;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: system },
      { role: 'user', content: message },
    ];

    const _options: any = {
      messages,
      model,
      stream: false,
      thinking: { type: 'disabled' },
    };

    if (thinking) {
      delete _options.thinking;
    }

    const resp = await this.openai.chat.completions.create(_options);

    const content = _.get(resp, 'choices[0].message.content', '');

    return content;
  }

  // ==================== 网页搜索与抓取（Search & Fetch）====================
  // 文档: https://api-docs.deepseek.com/guides/search
  // Search / Fetch 为独立 API，按成功请求次数计费，与 chat completions 分开。

  private get dsKey(): string {
    return this.configService.get<string>('deepseek.DS_KEY') || '';
  }

  /** Search/Fetch 接口固定挂在 /v1/tools 下，兼容 DS_URL 以 /v1 结尾的配置 */
  private get toolsBaseUrl(): string {
    const dsUrl =
      this.configService.get<string>('deepseek.DS_URL') ||
      'https://api.deepseek.com';
    return dsUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
  }

  private async toolsRequest<T>(
    path: string,
    data: Record<string, unknown>,
    timeout = 30_000,
  ): Promise<T> {
    try {
      const resp = await axios.post<T>(`${this.toolsBaseUrl}${path}`, data, {
        headers: {
          Authorization: `Bearer ${this.dsKey}`,
          'Content-Type': 'application/json',
        },
        timeout,
      });
      return resp.data;
    } catch (err) {
      const status = _.get(err, 'response.status', 500);
      const message = _.get(
        err,
        'response.data.error.message',
        _.get(err, 'message', 'unknown error'),
      );
      throw new HttpException(`DeepSeek ${path} 请求失败: ${message}`, status);
    }
  }

  /**
   * 网页搜索：调用 DeepSeek 自研搜索引擎，返回结构化搜索结果。
   * 计费：每 1000 次成功请求 5 元；空结果不计费。QPS 上限 100。
   */
  async search(
    options: DeepSeekSearchOptions,
  ): Promise<DeepSeekSearchResponse> {
    return this.toolsRequest<DeepSeekSearchResponse>('/v1/tools/search', {
      ...options,
    });
  }

  /**
   * 网页抓取：抓取单个网页并返回 Markdown 内容。
   * 计费：每 1000 次成功请求 5 元。QPS 上限 25（另有单域名限额）。
   */
  async fetchPage(
    options: DeepSeekFetchOptions,
  ): Promise<DeepSeekFetchResponse> {
    return this.toolsRequest<DeepSeekFetchResponse>(
      '/v1/tools/fetch',
      { url: options.url },
      60_000,
    );
  }
}
