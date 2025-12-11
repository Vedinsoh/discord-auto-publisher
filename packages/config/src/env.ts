import 'dotenv/config';
import { loggerLevels } from '@ap/logger';
import { cleanEnv, num, str, url } from 'envalid';

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

  // Backend
  MONGO_URI: url({ default: 'mongodb://bot:27017' }),

  // Bot
  BOT_SUPPORT_GUILD_ID: str({ default: '' }),
  BOT_SHARDS: num({ default: 1 }),
  BOT_SHARDS_PER_CLUSTER: num({ default: 1 }),
});
