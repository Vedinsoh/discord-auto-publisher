import { Constants } from 'discord.js-light';
import { Event } from '#structures/Event';
import logger from '#util/logger';

export default new Event(Constants.Events.DEBUG, async (message) => {
  if (!message.match(/heartbeat/gi)) logger.debug(message);
});
