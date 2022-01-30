export const hourToMs = (hour: number): number => {
  return hour * 60 * 60 * 1000;
};

export const minToMs = (minute: number): number => {
  return minute * 60 * 1000;
};

export const secToMs = (second: number): number => {
  return second * 1000;
};

export const msToSec = (ms: number): number => {
  return ms / 1000;
};
