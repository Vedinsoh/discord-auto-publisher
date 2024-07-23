import 'dotenv/config';
import { cleanEnv, num, port, str, testOnly, url } from 'envalid';
import { levels as loggerLevels } from 'pino';

export const env = cleanEnv(process.env, {
  // Common
  NODE_ENV: str({ devDefault: testOnly('test'), choices: ['development', 'production', 'test'] }),
  LOGGER_LEVEL: str({ default: 'info', choices: Object.values(loggerLevels.labels) }),
  REDIS_URI: url({ default: 'redis://rest-cache:6379' }),
  DISCORD_TOKEN: str({ devDefault: testOnly('') }),

  // Bot
  BOT_ADMINS: str({ default: '' }),
  BOT_SHARDS: num({ default: 1 }),
  BOT_SHARDS_PER_CLUSTER: num({ default: 1 }),

  // REST
  REST_PORT: port({ devDefault: 3000 }),
});
