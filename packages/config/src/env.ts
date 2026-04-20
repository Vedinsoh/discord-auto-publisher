import 'dotenv/config';
import { loggerLevels } from '@ap/logger';
import { cleanEnv, num, str } from 'envalid';

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
  DATABASE_URL: str({ default: 'postgresql://postgres:postgres@localhost:54322/postgres' }),

  // Stripe
  STRIPE_SECRET_KEY: str({ default: '' }),
  STRIPE_WEBHOOK_SECRET: str({ default: '' }),

  // Invoicing (optional external service)
  INVOICING_WEBHOOK_URL: str({ default: '' }),
  INVOICING_WEBHOOK_SECRET: str({ default: '' }),

  // Web
  WEB_APP_ORIGIN: str({ default: 'http://localhost:3100' }),

  // Premium
  PREMIUM_BOT_CLIENT_ID: str({ default: '' }),

  // Bot
  BOT_SUPPORT_GUILD_ID: str({ default: '' }),
  BOT_SHARDS: num({ default: 1 }),
  BOT_SHARDS_PER_CLUSTER: num({ default: 1 }),
});
