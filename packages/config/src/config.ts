import { env } from './env.js';

const IS_PREMIUM = env.APP_EDITION === 'premium';

/**
 * Application configuration
 */
export const config = {
  /**
   * Check if the application is running in premium edition
   */
  isPremiumInstance: IS_PREMIUM,
  /**
   * Application limits
   */
  limits: {
    /**
     * Maximum channels per guild
     */
    channelsPerGuild: IS_PREMIUM ? 0 : 5, // 0 means unlimited
    /**
     * Maximum filters per channel
     */
    filtersPerChannel: 5,
  },
  /**
   * Crosspost Worker configuration
   */
  crosspostWorker: {
    /**
     * Maximum Discord requests per second
     */
    requestsPerSecond: 45,
  },
} as const;

// Re-export env
export { env };
