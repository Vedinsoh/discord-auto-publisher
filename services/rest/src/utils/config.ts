import dotenv from 'dotenv';
import { cleanEnv, host, port, str, testOnly } from 'envalid';

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ devDefault: testOnly('test'), choices: ['development', 'production', 'test'] }),
  // TODO url validation
  REDIS_URI: str({ devDefault: testOnly('redis://redis:6379') }),
  DISCORD_TOKEN: str({ devDefault: testOnly('') }),
  REST_HOST: host({ devDefault: testOnly('localhost') }),
  REST_PORT: port({ devDefault: testOnly(3000) }),
});
