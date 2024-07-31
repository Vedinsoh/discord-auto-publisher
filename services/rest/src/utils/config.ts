import 'dotenv/config';

import { cleanEnv, host, port, str, url } from 'envalid';
import { levels as loggerLevels } from 'pino';

export const env = cleanEnv(process.env, {
  // Common
  NODE_ENV: str({ default: 'development', choices: ['development', 'production', 'test'] }),
  LOGGER_LEVEL: str({ default: 'info', choices: Object.values(loggerLevels.labels) }),
  REDIS_URI: url({ default: 'redis://rest-cache:6379' }),
  MONGO_URI: url({ default: 'mongodb://rest-db:27017' }),
  DISCORD_TOKEN: str({ default: '' }),

  // REST
  REST_HOST: host({ default: 'localhost' }),
  REST_PORT: port({ devDefault: 3000 }),
});
