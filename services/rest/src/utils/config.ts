import dotenv from 'dotenv';
import { cleanEnv, host, port, str, testOnly } from 'envalid';

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ devDefault: testOnly('test'), choices: ['development', 'production', 'test'] }),
  HOST: host({ devDefault: testOnly('localhost') }),
  PORT: port({ devDefault: testOnly(3000) }),
  MONGO_URI: str({ devDefault: testOnly('mongodb://mongo:27017/auto_publisher') }),
  REDIS_URI: str({ devDefault: testOnly('redis://redis:6379') }),
  DISCORD_TOKEN: str({ devDefault: testOnly('') }),
});
