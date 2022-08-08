import { RateLimitData } from 'discord.js-light';
import pathPatterns from '#constants/pathPatterns';

export default (data: RateLimitData) => {
  return data.method.toUpperCase() === 'POST' && pathPatterns.crosspost.test(data.path);
};
