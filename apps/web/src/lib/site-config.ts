import 'server-only';
import { config, env, isPublicInstance } from '@ap/config';

export type SiteConfig = {
  /** False for a self-hosted copy: no billing, no upgrade paths, one bot. */
  isPublicInstance: boolean;
  /** Self-host: the single application's id, which is also the OAuth client. */
  freeBotId: string;
  /** Public instance only — empty when self-hosted (there is no second bot). */
  premiumBotId: string;
  /**
   * MIGRATION: legacy sunset date (`YYYY-MM-DD`, UTC) from `@ap/config`, which
   * the bot reads directly. Rides this context because every surface rendering
   * it is a client component. Removed with the legacy UX at sunset.
   */
  legacySunsetDate: string;
  /**
   * Client-side Paddle.js token, empty when billing is not configured (always so when
   * self-hosted). Served at runtime rather than inlined as a `NEXT_PUBLIC_` build-time
   * value — see `PADDLE_CLIENT_TOKEN` in `@ap/config`.
   */
  paddleClientToken: string;
  /**
   * Which Paddle instance the browser talks to. Derived from the same `PADDLE_ENVIRONMENT`
   * the backend uses, so the overlay cannot talk to sandbox while the webhooks talk to live.
   */
  paddleEnvironment: 'sandbox' | 'production';
};

/**
 * Resolve deployment config on the server, once per render.
 *
 * A self-hosted instance runs ONE Discord application: the same client id logs
 * the admin in and is the bot they invite. The public instance authenticates
 * with one application but invites two others, which is why the pair exists.
 */
export function getSiteConfig(): SiteConfig {
  return {
    isPublicInstance,
    freeBotId: isPublicInstance ? env.DISCORD_FREE_BOT_ID : env.DISCORD_CLIENT_ID,
    premiumBotId: isPublicInstance ? env.DISCORD_PREMIUM_BOT_ID : '',
    legacySunsetDate: config.legacySunsetDate,
    paddleClientToken: isPublicInstance ? env.PADDLE_CLIENT_TOKEN : '',
    paddleEnvironment: env.PADDLE_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
  };
}
