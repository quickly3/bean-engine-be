import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { ChatDeepSeek } from '@langchain/deepseek';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { MemorySaver } from '@langchain/langgraph';
import * as tslab from 'tslab';
import { chartTool } from './tools/aiTools';
import * as fs from 'fs';
import { multiply } from './tools/weatherTool';
import * as _ from 'lodash';
import { END, START, StateGraph, Annotation } from '@langchain/langgraph';

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
    // Define the tools for the agent to use

    const StateAnnotation = Annotation.Root({
      aggregate: Annotation<string[]>({
        reducer: (x, y) => x.concat(y),
      }),
    });

    // Create the graph
    const nodeA = (state: typeof StateAnnotation.State) => {
      console.log(`Adding I'm A to ${state.aggregate}`);
      return { aggregate: [`I'm A`] };
    };
    const nodeB = (state: typeof StateAnnotation.State) => {
      console.log(`Adding I'm B to ${state.aggregate}`);
      return { aggregate: [`I'm B`] };
    };
    const nodeC = (state: typeof StateAnnotation.State) => {
      console.log(`Adding I'm C to ${state.aggregate}`);
      return { aggregate: [`I'm C`] };
    };
    const nodeD = (state: typeof StateAnnotation.State) => {
      console.log(`Adding I'm D to ${state.aggregate}`);
      return { aggregate: [`I'm D`] };
    };

    const builder = new StateGraph(StateAnnotation)
      .addNode('a', nodeA)
      .addEdge(START, 'a')
      .addNode('b', nodeB)
      .addNode('c', nodeC)
      .addNode('d', nodeD)
      .addEdge('a', 'b')
      .addEdge('a', 'c')
      .addEdge('b', 'd')
      .addEdge('c', 'd')
      .addEdge('d', END);

    const graph = builder.compile();

    // const representation = graph.getGraph();
    // const image = await representation.drawMermaidPng();
    // const arrayBuffer = await image.arrayBuffer();

    // const buffer = Buffer.from(arrayBuffer);
    // const filePath = 'graph.png';
    // // Write the buffer to a PNG file
    // fs.writeFileSync(filePath, new Uint8Array(buffer));

    // console.log(`PNG file saved at: ${filePath}`);

    const baseResult = await graph.invoke({ aggregate: [] });
    console.log('Base Result: ', baseResult);
  }

  async testTavily() {
    // Define the tools for the agent to use
    const agentTools = [
      new TavilySearchResults({
        maxResults: 3,
        apiKey: this.configService.get('deepseek.TAVILY_KEY'),
      }),
    ];
    const agentModel = new ChatDeepSeek({
      model: 'deepseek-chat',
      apiKey: this.configService.get('deepseek.DS_KEY'),
    });

    // Initialize memory to persist state between graph runs
    const agentCheckpointer = new MemorySaver();
    const agent = createReactAgent({
      llm: agentModel,
      tools: agentTools,
      checkpointSaver: agentCheckpointer,
    });

    // Now it's time to use!
    const agentFinalState = await agent.invoke(
      { messages: [new HumanMessage('what is the current weather in sf')] },
      { configurable: { thread_id: '42' } },
    );

    console.log(
      agentFinalState.messages[agentFinalState.messages.length - 1].content,
    );

    const agentNextState = await agent.invoke(
      { messages: [new HumanMessage('what about ny')] },
      { configurable: { thread_id: '42' } },
    );

    console.log(
      agentNextState.messages[agentNextState.messages.length - 1].content,
    );
  }
}
