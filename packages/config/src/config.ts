import { env } from './env.js';

const IS_PREMIUM = env.APP_EDITION === 'premium';

/** Mirrors the backend's `FREE_CHANNEL_LIMIT` (`services/editions.ts`), the enforcing authority. */
const FREE_CHANNELS_PER_GUILD = 3;

/**
 * Application configuration.
 * Edition-derived values apply to the per-edition apps (bot, proxy) only —
 * the backend is edition-agnostic and derives limits per guild.
 */
export const config = {
  /**
   * Check if the application is running in premium edition
   */
  isPremiumInstance: IS_PREMIUM,
  /**
   * This edition's bot token
   */
  discordToken: IS_PREMIUM ? env.DISCORD_TOKEN_PREMIUM : env.DISCORD_TOKEN_FREE,
  /**
   * This edition's proxy base URL
   */
  proxyUrl: IS_PREMIUM ? env.PROXY_URL_PREMIUM : env.PROXY_URL_FREE,
  /**
   * This edition's outbound source IP for Discord traffic; empty = default route
   */
  egressLocalAddress: IS_PREMIUM ? env.EGRESS_LOCAL_ADDRESS_PREMIUM : env.EGRESS_LOCAL_ADDRESS_FREE,
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

// Re-export env
export { env };
