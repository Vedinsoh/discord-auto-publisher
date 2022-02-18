import { RateLimitData } from 'discord.js-light';

export const crosspostPath = /\/channels\/\d{16,19}\/messages\/\d{16,19}\/crosspost/;

export default (data: RateLimitData): boolean => {
  return data.method.toUpperCase() === 'POST' && crosspostPath.test(data.path);
};
