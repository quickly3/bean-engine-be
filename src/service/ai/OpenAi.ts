import { HttpsProxyAgent } from 'https-proxy-agent';
import OpenAI from 'openai';
import * as _ from 'lodash';
import { ConfigService } from '@nestjs/config';
import { OPENAI_MODEL } from './enum';

export default class OpenAi {
  openai;
  axiosRequestConfig: any;
  aiModel = OPENAI_MODEL.GPT4;
  prompts: any[] = [];

  constructor(private readonly configService: ConfigService) {
    const { GPT_KEY } = this.configService.get('openai');
    const ENV = this.configService.get('env');
    const PROXY = 'http://localhost:7890';
    const HTTPS_PROXY = 'https://localhost:7890';

    const axiosConfig = {
      proxy: false,
      httpAgent: new HttpsProxyAgent(PROXY),
      httpsAgent: new HttpsProxyAgent(HTTPS_PROXY),
    };
    this.axiosRequestConfig = ENV == 'local' ? axiosConfig : {};

    this.openai = new OpenAI({
      apiKey: GPT_KEY, // This is the default and can be omitted
    });
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

  async simpleCompl(messages) {
    const completion = await this.openai.chat.completions.create(
      {
        model: this.aiModel,
        messages: messages,
      },
      this.axiosRequestConfig,
    );
    const message = _.get(completion, 'choices[0].message');
    return message;
  }

  async listModels() {
    const resp = await this.openai.listModels(this.axiosRequestConfig);
    return resp.data.data;
  }
}
