import { Events } from 'discord.js';
import client from '#client';
import Event from '#structures/Event';

export default new Event(Events.Debug, async (message) => {
  // Filter out certain debug messages
  if (message.match(/heartbeat/gi)) {
    return;
  }

  client.logger.debug(message);
});
