import type { RateLimitData } from 'discord.js';
import routes from '#constants/routes';

const gatewayQueueFilter = (data: RateLimitData): boolean => {
  return data.method.toUpperCase() === 'POST' && routes.crosspost === data.route && !data.global;
};

export default gatewayQueueFilter;
