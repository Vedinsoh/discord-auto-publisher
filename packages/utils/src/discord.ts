/**
 * Converts a Unix timestamp (in milliseconds) to Discord's timestamp format (in seconds).
 *
 * @param timestamp - The timestamp in milliseconds to convert. If `undefined` or falsy, returns `0`.
 * @returns The timestamp in seconds, rounded down to the nearest integer. Returns `0` if input is falsy.
 */
export const getDiscordFormat = (timestamp: number | undefined): number => {
  if (!timestamp) return 0;
  return Math.floor((timestamp || 0) / 1000);
};
