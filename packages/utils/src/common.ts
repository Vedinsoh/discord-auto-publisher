/**
 * Sleep for a given amount of time
 * @param ms Time in milliseconds
 */
export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Capitalize the first letter of a string
 * @param str The string to capitalize
 * @returns The capitalized string
 */
export const capitalize = (str: string): string => {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Check if the application is running in premium edition
 * @returns boolean indicating if premium edition is active
 */
export const isPremiumInstance = process.env.APP_EDITION === 'premium';
