import 'dotenv/config';
import { loggerLevels } from '@ap/logger';
import { cleanEnv, host, port, str, url } from 'envalid';

export const env = cleanEnv(process.env, {
  // Runtime
  NODE_ENV: str({ default: 'development', choices: ['development', 'production', 'test'] }),
  LOGGER_LEVEL: str({ default: 'info', choices: loggerLevels }),

  // Common
  DISCORD_TOKEN: str({ default: '' }),

  // Bot API
  REDIS_URI: url({ default: 'redis://bot-api-cache:6379' }),
  MONGO_URI: url({ default: 'mongodb://bot:27017' }),
  REST_HOST: host({ default: 'localhost' }),
  REST_PORT: port({ devDefault: 8080 }),
});
