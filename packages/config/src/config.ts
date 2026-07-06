import { env } from './env.js';

const IS_PREMIUM = env.APP_EDITION === 'premium';

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
     * Maximum channels per guild
     */
    channelsPerGuild: IS_PREMIUM ? 0 : 3, // 0 means unlimited
    /**
     * Maximum filters per channel
     */
    filtersPerChannel: 5,
  },
} as const;

// Re-export env
export { env };
