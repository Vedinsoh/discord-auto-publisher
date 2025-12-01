import 'dotenv/config';
import { loggerLevels } from '@ap/logger';
import { cleanEnv, str, url } from 'envalid';

/**
 * Environment variables
 */
export const env = cleanEnv(process.env, {
  // Runtime
  NODE_ENV: str({ default: 'development', choices: ['development', 'production', 'test'] }),
  LOGGER_LEVEL: str({ default: 'info', choices: loggerLevels }),

  // Common
  DISCORD_TOKEN: str({ default: '' }),
  APP_EDITION: str({ default: 'free', choices: ['free', 'premium'] }),

  // Bot API
  MONGO_URI: url({ default: 'mongodb://bot:27017' }),
});
