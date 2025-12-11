import { FilterType } from '@ap/validations';

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
 * Normalize filter values based on filter type
 * - Keyword filters: converted to lowercase for case-insensitive matching
 * - Other filter types: returned as-is
 * @param values Array of filter values
 * @param filterType Type of filter
 * @returns Normalized filter values
 */
export const normalizeFilterValues = (values: string[], filterType: FilterType): string[] => {
  if (filterType === FilterType.Keyword) {
    return values.map(value => value.toLowerCase());
  }
  return values;
};
