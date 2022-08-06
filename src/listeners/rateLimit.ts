import { Constants } from 'discord.js-light';
import { crosspostPath } from '#functions/crosspostQueueFilter';
import { Event } from '#structures/Event';
import logger from '#util/logger';

export default new Event(Constants.Events.RATE_LIMIT, async (data) => {
  if (!crosspostPath.test(data.path)) logger.warn(data);
});
