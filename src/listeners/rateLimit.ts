import { Constants } from 'discord.js-light';
import pathPatterns from '#constants/pathPatterns';
import Event from '#structures/Event';
import logger from '#util/logger';

export default new Event(Constants.Events.RATE_LIMIT, async (data) => {
  if (!pathPatterns.crosspost.test(data.path)) logger.warn(data);
});
