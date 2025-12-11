import { env } from './env.js';

/**
 * Application configuration
 */
export const config = {
  /**
   * Check if the application is running in premium edition
   */
  isPremiumInstance: env.APP_EDITION === 'premium',
} as const;

// Re-export env
export { env };
