import { Events } from 'discord.js';
import { Services } from '#services';
import Event from '#structures/Event';

export default new Event(Events.ClientReady, async () => {
  // Initialize bot presence
  Services.Presence.updateBotPresence();
  Services.Presence.startBotPresenceInterval();
  Services.Presence.startGuildsCountUpdateInterval();
});
