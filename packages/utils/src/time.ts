// Time conversion utilities
type TimeConversion = (time: number) => number;

// To milliseconds
export const secToMs: TimeConversion = second => second * 1000;
export const minToMs: TimeConversion = minute => minute * 60 * 1000;

// To seconds
export const msToSec: TimeConversion = ms => ms / 1000;
export const minToSec: TimeConversion = minute => minute * 60;

// To minutes
export const secToMin: TimeConversion = second => second / 60;
