import { RateLimitData } from 'discord.js-light';
import { Event } from '#structures/Event';
import { crosspostPath } from '#functions/crosspostQueueFilter';
import logger from '#util/logger';

export default new Event('rateLimit', async (data: RateLimitData) => {
  if (!crosspostPath.test(data.path)) logger.warn(data);
});
