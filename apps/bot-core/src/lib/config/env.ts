import 'dotenv/config';
import { loggerLevels } from '@ap/logger';
import { cleanEnv, num, str } from 'envalid';

/**
 * Environment variables
 */
export const env = cleanEnv(process.env, {
  // Common
  DISCORD_TOKEN: str({ default: '' }),

  // Runtime
  NODE_ENV: str({ default: 'development', choices: ['development', 'production', 'test'] }),
  LOGGER_LEVEL: str({ default: 'info', choices: loggerLevels }),

  // Bot core
  BOT_APP_ID: str({ default: '' }),
  BOT_SUPPORT_GUILD_ID: str({ default: '' }),
  BOT_SHARDS: num({ default: 1 }),
  BOT_SHARDS_PER_CLUSTER: num({ default: 1 }),
});
