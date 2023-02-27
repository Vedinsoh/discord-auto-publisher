import { Events } from 'discord.js';
import client from '#client';
import Event from '#structures/Event';
import { minToMs } from '#util/timeConverters';

export default new Event(Events.ClientReady, async () => {
  await client.blacklist.startupCheck();

  setTimeout(() => {
    client.updatePresence();
  }, minToMs(1));

  client.startPresenceInterval();
});
