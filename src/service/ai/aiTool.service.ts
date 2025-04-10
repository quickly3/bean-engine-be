import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { PromptTemplate } from '@langchain/core/prompts';
import { ChatDeepSeek } from '@langchain/deepseek';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PROMPTS } from './prompts';

@Injectable()
export class AiToolService {
  constructor(private readonly configService: ConfigService) {}

  async transJsonArr(jsonArr) {
    const model = new ChatDeepSeek({
      apiKey: this.configService.get('deepseek.DS_KEY'),
      model: 'deepseek-chat',
    });

    const promptTemplate = PromptTemplate.fromTemplate(
      PROMPTS.TRANSLATE_JOSN_TO_CN,
    );
    const message = await promptTemplate.invoke({ field: 'description' });
    const messages = [
      new SystemMessage(message.value),
      new HumanMessage(JSON.stringify(jsonArr)),
    ];
    console.log('🚀 ~ AiToolService ~ transJsonArr ~ messages:', messages);

    const resp = await model.invoke(messages);
    return resp.content;
  }
}
