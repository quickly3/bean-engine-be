import { ChatDeepSeek } from '@langchain/deepseek';
import { HumanMessage } from '@langchain/core/messages';
import OpenAI from 'openai';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require('dotenv').config({ path: '../../.env' });

const { DS_KEY, DS_URL } = config.parsed;

async function list_models() {
  const openai = new OpenAI({
    baseURL: DS_URL,
    apiKey: DS_KEY,
  });

  const models = await openai.models.list();

  console.log(models);
}

async function chat() {
  const model = new ChatDeepSeek({
    apiKey: DS_KEY, // Default value.
    model: 'deepseek-reasoner',
  });

  const messages = [
    {
      role: 'user',
      content: '给我今天的日期',
    },
  ];

  const stream = await model.stream(messages);
  console.log(stream);
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
    console.log(`${chunk.content}|`);
  }
}

chat();
