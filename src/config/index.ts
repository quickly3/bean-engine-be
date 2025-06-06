import * as dotenv from 'dotenv';
dotenv.config();

export default () => {
  const nodeEnv: string = process.env.NODE_ENV || 'local';

  const feUrl = process.env.FE_URL;
  return {
    debug: process.env.DEBUG === 'true',
    env: nodeEnv,
    nodeEnv,
    feUrl: feUrl,
    port: parseInt(process.env.PORT, 10) || 3001,
    es: {
      node: process.env.ES_HOST,
    },
    neo4j: {
      scheme: process.env.NEO4J_SCHEME,
      host: process.env.NEO4J_HOST,
      port: process.env.NEO4J_PORT,
      username: process.env.NEO4J_USERNAME,
      password: process.env.NEO4J_PASSWORD,
      database: process.env.NEO4J_DATABASE,
    },
    feishu: {
      FS_APP_ID: process.env.FS_APP_ID,
      FS_APP_SECRET: process.env.FS_APP_SECRET,
      FS_ROBOT_UNION_ID: process.env.FS_ROBOT_UNION_ID,
    },
    feishu2: {
      FS_APP_ID: process.env.FS_APP_ID_2,
      FS_APP_SECRET: process.env.FS_APP_SECRET_2,
      FS_ROBOT_UNION_ID: process.env.FS_ROBOT_UNION_ID_2,
    },
    openai: {
      GPT_KEY: process.env.GPT_KEY,
      ENV: process.env.GPT_ENV,
      GPT_PROXY: process.env.GPT_PROXY,
    },
    google: {
      geminiKey: process.env.GEMINI_KEY,
    },
    deepseek: {
      DS_KEY: process.env.DS_KEY,
      TAVILY_KEY: process.env.TAVILY_KEY,
    },
    github: {
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    },
  };
};
