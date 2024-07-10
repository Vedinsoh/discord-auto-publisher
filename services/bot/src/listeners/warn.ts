import { Events } from 'discord.js';
import client from '#client';
import Event from '#structures/Event';

export default new Event(Events.Warn, async (info) => {
  client.logger.warn(info);
});
