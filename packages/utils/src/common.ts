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

/**
 * Normalize filter values based on filter type
 * - Keyword filters: converted to lowercase for case-insensitive matching
 * - Other filter types: returned as-is
 * @param values Array of filter values
 * @param filterType Type of filter
 * @returns Normalized filter values
 */
export const normalizeFilterValues = (
  values: string[],
  filterType: 'keyword' | 'mention' | 'author' | 'webhook'
): string[] => {
  if (filterType === 'keyword') {
    return values.map(value => value.toLowerCase());
  }
  return values;
};
