import { Events } from 'discord.js';
import client from '#client';
import Event from '#structures/Event';

export default new Event(Events.Error, async (error) => {
  client.logger.error(error);
});
