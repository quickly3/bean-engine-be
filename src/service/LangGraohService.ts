import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { ChatDeepSeek } from '@langchain/deepseek';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { DynamicTool, tool } from '@langchain/core/tools';
import { ChatAnthropic } from '@langchain/anthropic';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { z } from 'zod';

@Injectable()
export class LangGraohService {
  constructor(private readonly configService: ConfigService) {}
  async testLangChain() {
    const model = new ChatDeepSeek({
      model: 'deepseek-chat',
      apiKey: this.configService.get('deepseek.DS_KEY'),
    });
    const messages = [
      new SystemMessage('你是一个可爱的女生'),
      new HumanMessage('帮我介绍一下三体人'),
    ];

    const AIMessage = await model.invoke(messages);
    console.log(AIMessage);
  }

  async testLangChainStream() {
    const model = new ChatDeepSeek({
      model: 'deepseek-chat',
      apiKey: this.configService.get('deepseek.DS_KEY'),
    });
    const messages = [
      new SystemMessage('你是一个可爱的女生'),
      new HumanMessage('帮我介绍一下三体人'),
    ];

    const stream = await model.stream(messages);

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
      console.log(`${chunk.content}|`);
    }
  }

  async templateStream() {
    const model = new ChatDeepSeek({
      model: 'deepseek-chat',
      apiKey: this.configService.get('deepseek.DS_KEY'),
    });

    const systemTemplate = '你是一个可爱的{role}';
    const promptTemplate = ChatPromptTemplate.fromMessages([
      ['system', systemTemplate],
      ['user', '{text}'],
    ]);

    const promptValue = await promptTemplate.invoke({
      role: '猫',
      text: '你是什么',
    });

    const response = await model.invoke(promptValue);
    console.log(response.content);
  }

  async testLangGraph() {
    const search = tool(
      async ({ query }) => {
        if (
          query.toLowerCase().includes('sf') ||
          query.toLowerCase().includes('san francisco')
        ) {
          return "It's 60 degrees and foggy.";
        }
        return "It's 90 degrees and sunny.";
      },
      {
        name: 'search',
        description: 'Call to surf the web.',
        schema: z.object({
          query: z.string().describe('The query to use in your search.'),
        }),
      },
    );

    const model = new ChatDeepSeek({
      model: 'deepseek-chat',
      apiKey: this.configService.get('deepseek.DS_KEY'),
    });

    const agent = createReactAgent({
      llm: model,
      tools: [search],
    });

    const result = await agent.invoke({
      messages: [
        {
          role: 'user',
          content: 'what is the weather in sf',
        },
      ],
    });
    console.log(result);
  }
}
