import { Constants, RateLimitData } from 'discord.js-light';
import { Event } from '#structures/Event';
import { crosspostPath } from '#functions/crosspostQueueFilter';
import logger from '#util/logger';

export default new Event(Constants.Events.RATE_LIMIT, async (data: RateLimitData) => {
  if (!crosspostPath.test(data.path)) logger.warn(data);
});
