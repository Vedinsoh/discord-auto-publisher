import { Events } from 'discord.js';
import Event from '#structures/Event';
import logger from '#util/logger';

export default new Event(Events.Debug, async (message) => {
  if (!message.match(/heartbeat/gi)) logger.debug(message);
});
