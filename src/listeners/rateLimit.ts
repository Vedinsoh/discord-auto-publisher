import { RateLimitData } from 'discord.js-light';
import { Event } from '#structures/Event';
import logger from '#util/logger';

export default new Event('rateLimit', async (info: RateLimitData) => {
  logger.warn(info);
});
