type TimeConversion = (time: number) => number;

export const secToMs: TimeConversion = (second) => second * 1000;
export const minToMs: TimeConversion = (minute) => minute * 60 * 1000;

export const msToSec: TimeConversion = (ms) => ms / 1000;
export const minToSec: TimeConversion = (minute) => minute * 60;

export const secToMin: TimeConversion = (second) => second / 60;

export const getDiscordFormat = (timestamp: number | undefined) => {
  if (!timestamp) return 0;
  return Math.floor((timestamp || 0) / 1000);
};
