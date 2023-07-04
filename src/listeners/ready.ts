import { Events } from 'discord.js';
import client from '#client';
import Event from '#structures/Event';

export default new Event(Events.ClientReady, async () => {
  client.blacklist.startOrphansCleanupInterval();
  await client.blacklist.orphansCleanup();

  client.startPresenceInterval();
  client.updatePresence();
  client.data.startGuildsCountInterval();
});
