import OpenAI from 'openai';
import * as _ from 'lodash';
import { ConfigService } from '@nestjs/config';
import { OPENAI_MODEL } from './enum';

export default class OpenAi {
  openai;
  axiosRequestConfig: any;
  aiModel = OPENAI_MODEL.GPT3;
  prompts: any[] = [];

  constructor(
    private readonly configService: ConfigService,
    aiType = 'openai',
  ) {
    const { GPT_KEY, OPENAI_PROXY_URL } = this.configService.get('openai');
    let option: any = {
      apiKey: GPT_KEY,
      base_url: OPENAI_PROXY_URL,
    };

    if (aiType && aiType === 'deepseek') {
      const { DS_KEY } = this.configService.get('deepseek');
      option = {
        base_url: 'https://api.deepseek.com',
        apiKey: DS_KEY,
      };
    }

    console.log('aiType', aiType);

    // if (this.configService.get('env') == 'local') {
    //   option.httpAgent = new HttpsProxyAgent(
    //     this.configService.get('openai.GPT_PROXY'),
    //   );
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
