import type { RateLimitData } from 'discord.js';
import pathPatterns from '#constants/pathPatterns';

const gatewayQueueFilter = (data: RateLimitData) => {
  return data.method.toUpperCase() === 'POST' && pathPatterns.crosspost.test(data.path);
};

export default gatewayQueueFilter;
