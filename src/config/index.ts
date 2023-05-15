import * as dotenv from 'dotenv';
dotenv.config();

export default () => {
  const nodeEnv: string = process.env.NODE_ENV || 'local';
  return {
    debug: process.env.DEBUG === 'true',
    env: nodeEnv,
    nodeEnv,
    port: parseInt(process.env.PORT, 10) || 3001,
    es: {
      node: process.env.ES_HOST,
    },
  };
};
