type TimeConversion = (time: number) => number;

export const secToMs: TimeConversion = (second) => second * 1000;
export const minToMs: TimeConversion = (minute) => minute * 60 * 1000;

export const msToSec: TimeConversion = (ms) => ms / 1000;
export const minToSec: TimeConversion = (minute) => minute * 60;
