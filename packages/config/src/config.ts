import { env } from './env.js';

/**
 * Application configuration
 */
export const config = {
  /**
   * Check if the application is running in premium edition
   */
  isPremiumInstance: env.APP_EDITION === 'premium',
  /**
   * Application limits
   */
  limits: {
    /**
     * Maximum channels per guild
     */
    channelsPerGuild: env.APP_EDITION === 'premium' ? 0 : 3,
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
