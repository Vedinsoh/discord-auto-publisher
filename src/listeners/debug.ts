import { Constants } from 'discord.js-light';
import { Event } from '#structures/Event';
import logger from '#util/logger';

export default new Event(Constants.Events.DEBUG, async (info: string) => {
  if (!info.match(/heartbeat/gi)) logger.debug(info);
});
