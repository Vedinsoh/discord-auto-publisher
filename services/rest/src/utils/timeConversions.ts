type TimeConvert = (time: number) => number;

// To milliseconds
export const secToMs: TimeConvert = (second) => second * 1000;
export const minToMs: TimeConvert = (minute) => minute * 60 * 1000;

// To seconds
export const msToSec: TimeConvert = (ms) => ms / 1000;
export const minToSec: TimeConvert = (minute) => minute * 60;

// To minutes
export const secToMin: TimeConvert = (second) => second / 60;

// Other
export const getDiscordFormat = (timestamp: number | undefined) => {
  if (!timestamp) return 0;
  return Math.floor((timestamp || 0) / 1000);
};
