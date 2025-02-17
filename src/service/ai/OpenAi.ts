import { HttpsProxyAgent } from 'https-proxy-agent';
import OpenAI from 'openai';
import * as _ from 'lodash';
import { ConfigService } from '@nestjs/config';
import { OPENAI_MODEL } from './enum';
import * as http from 'http';

export default class OpenAi {
  openai;
  axiosRequestConfig: any;
  aiModel = OPENAI_MODEL.GPT3;
  prompts: any[] = [];

  constructor(
    private readonly configService: ConfigService,
    aiType = 'openai',
  ) {
    const { GPT_KEY } = this.configService.get('openai');
    let option: any = {
      apiKey: GPT_KEY,
    };

    if (aiType && aiType === 'deepseek') {
      const { DS_KEY } = this.configService.get('deepseek');
      option = {
        base_url: 'https://api.deepseek.com',
        apiKey: DS_KEY,
      };
    }

    // if (ENV == 'local') {
    //   option.httpAgent = new HttpsProxyAgent(HTTPS_PROXY);
    // }

    this.openai = new OpenAI(option);
  }

  async getTypeSettings() {
    return;
  }

  async setPrompts(prompts) {
    this.prompts = prompts;
  }

  async setModel(aiModel) {
    this.aiModel = aiModel;
  }

  async simpleComplSimple(message) {
    this.setPrompts(this.prompts);
    const messages: any = [];

    if (this.prompts.length > 0) {
      for (const prompt of this.prompts) {
        messages.push({ role: 'system', content: prompt });
      }
    }

    messages.push({ role: 'user', content: message });
    return this.simpleCompl(messages);
  }

  async simpleCompl(messages) {
    const completion = await this.openai.chat.completions.create({
      model: this.aiModel,
      messages: messages,
    });
    const message = _.get(completion, 'choices[0].message');
    return message;
  }

  async listModels() {
    const resp = await this.openai.listModels(this.axiosRequestConfig);
    return resp.data.data;
  }
}
