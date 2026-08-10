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

  // Bot + proxy edition selector (set per compose service); the backend is
  // edition-agnostic and uses the per-edition pairs below. Bot/proxy resolve
  // their own token, proxy URL, and egress IP from it via config. There is
  // deliberately no singular DISCORD_TOKEN/PROXY_URL override — a stale v6-era
  // env file must not silently make both editions share one Discord app.
  APP_EDITION: str({ default: 'free', choices: ['free', 'premium'] }),

  // Proxy: outbound source IPs for Discord traffic (per-edition Cloudflare ban
  // isolation); empty = default route (dev)
  EGRESS_LOCAL_ADDRESS_FREE: str({ default: '' }),
  EGRESS_LOCAL_ADDRESS_PREMIUM: str({ default: '' }),

  // Backend
  DATABASE_URL: str({ default: 'postgresql://postgres:postgres@localhost:54322/postgres' }),
  DISCORD_TOKEN_FREE: str({ default: '' }),
  DISCORD_TOKEN_PREMIUM: str({ default: '' }),
  PROXY_URL_FREE: str({ default: 'http://proxy-free:8080' }),
  PROXY_URL_PREMIUM: str({ default: 'http://proxy-premium:8080' }),

  // Redis
  REDIS_URI: str({ default: 'redis://redis:6379' }),

  // Alerts (optional; alerts are disabled when unset)
  ALERT_WEBHOOK_URL: str({ default: '' }),

  // Bot
  BOT_SUPPORT_GUILD_ID: str({ default: '958709555683033128' }),
  BOT_SHARDS: num({ default: 1 }),
  BOT_SHARDS_PER_CLUSTER: num({ default: 1 }),

  // Paddle (backend)
  PADDLE_ENVIRONMENT: str({ default: 'sandbox', choices: ['sandbox', 'production'] }),
  PADDLE_API_KEY: str({ default: '' }),
  PADDLE_WEBHOOK_SECRET: str({ default: '' }),
  PADDLE_PRICE_MONTHLY: str({ default: '' }),
  PADDLE_PRICE_YEARLY: str({ default: '' }),

  // Outbound email (backend) — the withdrawal acknowledgement is the only mail the
  // stack sends. Unset credentials disable sending rather than failing at startup;
  // the withdrawal flow reports it as an unsent acknowledgement.
  SMTP_HOST: str({ default: 'smtp.zoho.eu' }),
  SMTP_PORT: num({ default: 465 }),
  SMTP_USER: str({ default: '' }),
  SMTP_PASSWORD: str({ default: '' }),
  SMTP_FROM: str({ default: 'Auto Publisher <support@auto-publisher.gg>' }),

  // Web
  WEB_APP_ORIGIN: str({ default: 'http://localhost:3100' }),

  // Premium
  PREMIUM_BOT_CLIENT_ID: str({ default: '' }),
});
