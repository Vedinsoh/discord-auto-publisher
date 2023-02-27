import { Events } from 'discord.js';
import client from '#client';
import Event from '#structures/Event';

export default new Event(Events.Debug, async (message) => {
  if (!message.match(/heartbeat/gi)) client.logger.debug(message);
});
