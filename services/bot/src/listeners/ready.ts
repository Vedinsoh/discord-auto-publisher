import { Events } from 'discord.js';
import client from '#client';
import Event from '#structures/Event';
import { minToMs } from '#util/timeConverters';

export default new Event(Events.ClientReady, async () => {
  setTimeout(() => {
    client.updatePresence();
  }, minToMs(1));

  client.startPresenceInterval();
});
