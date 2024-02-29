import { HttpsProxyAgent } from 'https-proxy-agent';
import OpenAI from 'openai';
import * as _ from 'lodash';
import { ConfigService } from '@nestjs/config';

export default class AiTools {
  openai;
  axiosRequestConfig: any;

  constructor(private readonly configService: ConfigService) {
    const { GPT_KEY } = this.configService.get('openai');
    const ENV = this.configService.get('env');
    const PROXY = 'http://localhost:7890';

    const axiosConfig = {
      proxy: false,
      httpAgent: new HttpsProxyAgent(PROXY),
      httpsAgent: new HttpsProxyAgent(PROXY),
    };
    this.axiosRequestConfig = ENV == 'local' ? axiosConfig : {};

    this.openai = new OpenAI({
      apiKey: GPT_KEY, // This is the default and can be omitted
    });
  }

  async getTypeSettings() {
    return;
  }

  async simpleCompl(_messages) {
    const messages = _messages.map((d) => {
      return { role: 'system', content: d };
    });

    // gpt-3.5-turbo

    const completion = await this.openai.chat.completions.create(
      {
        model: 'gpt-4-0125-preview',
        messages: messages,
      },
      this.axiosRequestConfig,
    );
    const message = _.get(completion, 'choices[0].message.content');
    return message;
  }

  async listModels() {
    const resp = await this.openai.listModels(this.axiosRequestConfig);
    return resp.data.data;
  }
}
