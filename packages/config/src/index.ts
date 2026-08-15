// Single file on purpose. The dashboard bundles this package with Turbopack,
// which does not resolve the `.js`-extension convention TypeScript ESM uses for
// relative imports (`./env.js` -> `env.ts`). Every other `@ap/*` package the web
// imports is likewise single-file; splitting this one would break `next build`.

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Edition } from '@ap/api-types';
import { loggerLevels } from '@ap/logger';
import { config as loadDotenv } from 'dotenv';
import { cleanEnv, num, str } from 'envalid';

/**
 * Locate the monorepo root by walking up from this module.
 *
 * `dotenv/config` resolves against `process.cwd()`, which differs per entry
 * point — `apps/web` under `next dev`, `apps/backend` inside its container,
 * the repo root for drizzle-kit. A single shared env file could never be found
 * from all of them, which is why the web app used to need its own copy.
 */
const findRepoRoot = (): string | undefined => {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    if (existsSync(join(dir, 'turbo.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
};

// `.env.local` first: dotenv never overwrites an already-set key, so the dev
// override wins over `.env`, and the real process environment (Docker's
// `env_file`) wins over both. Containers carry no env file at all —
// `.dockerignore` excludes them — so this is a no-op there.
const repoRoot = findRepoRoot();
if (repoRoot) {
  for (const file of ['.env.local', '.env']) {
    loadDotenv({ path: resolve(repoRoot, file), quiet: true });
  }
}

// An empty value means "not set". envalid only falls back to `default` when a
// key is absent, so `DEPLOYMENT_MODE=` in an env file — a blank line someone
// uncommented — would otherwise fail the `choices` check and refuse to boot,
// even though absent is a perfectly valid way to ask for self-host.
if (process.env.DEPLOYMENT_MODE === '') delete process.env.DEPLOYMENT_MODE;

/**
 * Environment variables
 */
export const env = cleanEnv(process.env, {
  // Runtime
  NODE_ENV: str({ default: 'development', choices: ['development', 'production', 'test'] }),
  LOGGER_LEVEL: str({ default: 'info', choices: loggerLevels }),

  /**
   * Which deployment this is.
   *
   * `self-host` (the default) is a single bot that serves every guild with the
   * full feature set and no billing. `public` is the two-edition commercial
   * service. Deliberately NOT derived from `NODE_ENV`: a self-hoster must be
   * able to run `NODE_ENV=production` — which they should, for log levels and
   * optimized builds — without silently switching on billing and the
   * dual-edition topology. Defaulting to `self-host` also means a production
   * env that fails to mount errors on a missing token rather than quietly
   * degrading the public bot into an unlimited-free instance.
   */
  DEPLOYMENT_MODE: str({ default: 'self-host', choices: ['self-host', 'public'] }),

  // --- Self-host: the single bot ------------------------------------------
  // Only read when DEPLOYMENT_MODE is `self-host`. The public instance never
  // consults these, which is what preserves the invariant that a stale env
  // file cannot make both editions share one Discord application.
  DISCORD_BOT_TOKEN: str({ default: '' }),
  PROXY_URL: str({ default: 'http://proxy:8080' }),

  // --- Public instance: per-edition bots + proxies -------------------------
  // `APP_EDITION` is set per compose service and is public-only; self-host
  // pins the edition to `premium` below and never reads this.
  APP_EDITION: str({ default: 'free', choices: ['free', 'premium'] }),
  DISCORD_BOT_TOKEN_FREE: str({ default: '' }),
  DISCORD_BOT_TOKEN_PREMIUM: str({ default: '' }),
  PROXY_URL_FREE: str({ default: 'http://proxy-free:8080' }),
  PROXY_URL_PREMIUM: str({ default: 'http://proxy-premium:8080' }),

  // Proxy: outbound source IPs for Discord traffic (per-edition Cloudflare ban
  // isolation); empty = default route
  EGRESS_LOCAL_ADDRESS_FREE: str({ default: '' }),
  EGRESS_LOCAL_ADDRESS_PREMIUM: str({ default: '' }),

  // Backend
  DATABASE_URL: str({ default: 'postgresql://postgres:postgres@localhost:54322/postgres' }),

  // Redis
  REDIS_URI: str({ default: 'redis://redis:6379' }),

  // Alerts (optional; alerts are disabled when unset)
  DISCORD_ALERT_WEBHOOK_URL: str({ default: '' }),

  // Bot. `BOT_SUPPORT_GUILD_ID` is public-instance only — unset means the
  // guild-scoped admin commands are simply not registered.
  BOT_SUPPORT_GUILD_ID: str({ default: '' }),
  BOT_SHARDS: num({ default: 1 }),
  BOT_SHARDS_PER_CLUSTER: num({ default: 1 }),

  // --- Web dashboard -------------------------------------------------------
  // Required by the web app only; validated at its point of use so that a
  // misconfigured dashboard cannot stop the bot from publishing.
  //
  // Self-host uses ONE Discord application for everything, so
  // `DISCORD_CLIENT_ID` is both the OAuth client and the bot being invited.
  // The public instance logs in with one application but invites two others,
  // hence the extra pair below.
  AUTH_SECRET: str({ default: '' }),
  DISCORD_CLIENT_ID: str({ default: '' }),
  DISCORD_CLIENT_SECRET: str({ default: '' }),
  DISCORD_FREE_BOT_ID: str({ default: '' }),
  DISCORD_PREMIUM_BOT_ID: str({ default: '' }),
  WEB_APP_ORIGIN: str({ default: 'http://localhost:3100' }),
  /** Backend base URL the dashboard calls server-side (never from the browser). */
  BACKEND_URL: str({ default: 'http://backend:8080' }),

  // --- Public instance only: billing + statutory mail ----------------------
  PADDLE_ENVIRONMENT: str({ default: 'sandbox', choices: ['sandbox', 'production'] }),
  PADDLE_API_KEY: str({ default: '' }),
  PADDLE_WEBHOOK_SECRET: str({ default: '' }),
  PADDLE_PRICE_ID_MONTHLY: str({ default: '' }),
  PADDLE_PRICE_ID_YEARLY: str({ default: '' }),
  // The same two prices plus `trial_period: {interval: 'day', frequency: 14}`. The trial
  // belongs to the PRICE, so a trial subscriber keeps this price id for the subscription's
  // life and conversion to paid is not a price change — which is what stops `isPlanChange`
  // re-opening the withdrawal window over the first real charge.
  PADDLE_PRICE_ID_MONTHLY_TRIAL: str({ default: '' }),
  PADDLE_PRICE_ID_YEARLY_TRIAL: str({ default: '' }),
  /**
   * Client-side token for Paddle.js. Public by design; the API key is the secret.
   *
   * Deliberately NOT `NEXT_PUBLIC_`: Next.js reads `.env*` only from its own app directory,
   * never the monorepo root, so a build-time inlined value resolved to `undefined` in the
   * browser and left the checkout button permanently disabled with nothing logged. It
   * reaches the browser at runtime via `getSiteConfig()` → `SiteConfigProvider`, which also
   * keeps the web image free of build args.
   */
  PADDLE_CLIENT_TOKEN: str({ default: '' }),

  // Outbound email — the withdrawal acknowledgement is the only mail the stack
  // sends. Unset credentials disable sending rather than failing at startup;
  // the withdrawal flow reports it as an unsent acknowledgement.
  SMTP_HOST: str({ default: 'smtp.zoho.eu' }),
  SMTP_PORT: num({ default: 465 }),
  SMTP_USER: str({ default: '' }),
  SMTP_PASSWORD: str({ default: '' }),
  SMTP_FROM: str({ default: 'Auto Publisher <support@auto-publisher.gg>' }),
});

/** True for the two-edition commercial deployment, false for a self-hosted copy. */
export const isPublicInstance = env.DEPLOYMENT_MODE === 'public';

/**
 * Whether checkout offers the free trial at all — the one gate every trial surface reads,
 * backend and dashboard alike.
 *
 * Both price ids or neither: the disclosure a buyer sees is written before an interval is
 * chosen, so a half-configured trial would advertise on one interval and charge immediately
 * on the other. A misconfiguration must read as "no trial", never "trial on one interval".
 *
 * Unsetting either variable is therefore also the kill switch — selling continues at the
 * plain prices and every trial claim disappears from the UI in the same move.
 */
export const premiumTrialEnabled =
  isPublicInstance && !!env.PADDLE_PRICE_ID_MONTHLY_TRIAL && !!env.PADDLE_PRICE_ID_YEARLY_TRIAL;

/**
 * Assert the variables this deployment mode actually needs.
 *
 * Called explicitly from each long-running process rather than at module
 * import: `next build` evaluates server modules, and the web image is built
 * before any env file exists, so an import-time throw would break the build
 * for a token the web app never even reads.
 *
 * Deliberately no "you set a variable this mode ignores" errors — each mode
 * reads only its own keys, so a stray leftover is inert. That also lets a
 * maintainer flip `DEPLOYMENT_MODE` on an existing env file to exercise the
 * self-host path without maintaining a second one.
 */
export const assertRequiredEnv = (): void => {
  const missing = isPublicInstance
    ? (['DISCORD_BOT_TOKEN_FREE', 'DISCORD_BOT_TOKEN_PREMIUM'] as const).filter(key => !env[key])
    : (['DISCORD_BOT_TOKEN'] as const).filter(key => !env[key]);

  if (missing.length === 0) return;

  throw new Error(
    `Missing required environment variable(s) for DEPLOYMENT_MODE="${env.DEPLOYMENT_MODE}": ${missing.join(', ')}. ` +
      (isPublicInstance ? 'See docs/public-instance/.env.example.' : 'See docs/self-hosting.md.')
  );
};

/**
 * The edition this process runs as.
 *
 * A self-hosted instance is a single bot with no billing, so it runs as
 * `premium` unconditionally: that is what the backend's existing per-guild
 * logic already resolves to when no free bot is present, giving unlimited
 * channels and filters with no special-casing and no third edition literal.
 * `APP_EDITION` is therefore public-instance only.
 */
const EDITION: Edition = isPublicInstance ? (env.APP_EDITION as Edition) : 'premium';
const IS_PREMIUM = EDITION === 'premium';

/** Mirrors the backend's `FREE_CHANNEL_LIMIT` (`services/editions.ts`), the enforcing authority. */
const FREE_CHANNELS_PER_GUILD = 3;

/**
 * Application configuration.
 * Edition-derived values apply to the per-edition apps (bot, proxy) only —
 * the backend is edition-agnostic and derives limits per guild.
 */
export const config = {
  /**
   * Whether this is the public two-edition commercial deployment. False for a
   * self-hosted copy, which has no billing, no handover and one bot.
   */
  isPublicInstance,
  /**
   * This process's edition. Always `premium` when self-hosted.
   */
  edition: EDITION,
  /**
   * Check if the application is running in premium edition
   */
  isPremiumInstance: IS_PREMIUM,
  /**
   * This edition's bot token. Self-host reads the singular variable; the
   * public instance never consults it, which is what keeps a stale env file
   * from making both editions share one Discord application.
   */
  discordToken: isPublicInstance
    ? IS_PREMIUM
      ? env.DISCORD_BOT_TOKEN_PREMIUM
      : env.DISCORD_BOT_TOKEN_FREE
    : env.DISCORD_BOT_TOKEN,
  /**
   * This edition's proxy base URL
   */
  proxyUrl: isPublicInstance
    ? IS_PREMIUM
      ? env.PROXY_URL_PREMIUM
      : env.PROXY_URL_FREE
    : env.PROXY_URL,
  /**
   * This edition's outbound source IP for Discord traffic; empty = default
   * route. Per-edition Cloudflare ban isolation is a public-instance concern —
   * a self-host has one bot and one IP.
   */
  egressLocalAddress: isPublicInstance
    ? IS_PREMIUM
      ? env.EGRESS_LOCAL_ADDRESS_PREMIUM
      : env.EGRESS_LOCAL_ADDRESS_FREE
    : '',
  /**
   * MIGRATION: the date legacy mode stops working, as `YYYY-MM-DD` (UTC).
   *
   * Shown on every legacy surface — the bot's `/ap overview`, the dashboard's
   * migrate banner and status section, and the marketing migration page. It
   * lives here, not per app, because two surfaces quoting different sunset
   * dates to the same admin is the one failure mode that matters. This module
   * is server-only (it reads the environment at import), so the dashboard's
   * client components receive it through `getSiteConfig()`.
   *
   * TODO(migration): replace with the real sunset date before v7 launch.
   * Placeholder only. Removed with the rest of the legacy UX at sunset.
   */
  legacySunsetDate: '2026-12-31',
  /**
   * Application limits
   */
  limits: {
    /**
     * The free plan's channel cap. Edition-independent on purpose: copy that
     * names the free limit ("over the free limit of 3", "capped at 3 channels")
     * is rendered by the premium bot too — while a handover is pending it can
     * see paused channels and free-limit rejections for a guild the free bot
     * still manages. Reading `channelsPerGuild` there would print 0.
     */
    freeChannelsPerGuild: FREE_CHANNELS_PER_GUILD,
    /**
     * Maximum channels this edition serves per guild; 0 means unlimited
     */
    channelsPerGuild: IS_PREMIUM ? 0 : FREE_CHANNELS_PER_GUILD,
    /**
     * Maximum filter conditions per channel (not surfaced in UI; over-limit shows a toast)
     */
    filtersPerChannel: 50,
  },
} as const;
