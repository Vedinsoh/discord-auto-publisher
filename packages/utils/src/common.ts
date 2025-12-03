/**
 * Sleep for a given amount of time
 * @param ms Time in milliseconds
 */
export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if the application is running in premium edition
 * @returns boolean indicating if premium edition is active
 */
export const isPremiumInstance = process.env.APP_EDITION === 'premium';
