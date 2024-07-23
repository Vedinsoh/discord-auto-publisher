import { Events } from 'discord.js';
import client from '#client';
import Event from '#structures/Event';
import { minToMs } from '#utils/timeConverters';

export default new Event(Events.ClientReady, async () => {
  // Initial presence update
  setTimeout(() => {
    client.updatePresence();
  }, minToMs(1));

  // Start the presence update interval
  client.startPresenceInterval();
});
