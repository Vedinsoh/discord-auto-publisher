import { ActivityType } from 'discord.js';
import { client } from 'lib/shard.js';

/**
 * Update the bot presence
 */
const updateBotPresence = async () => {
  client.user?.setPresence({
    activities: [
      {
        name: '/help | auto-publisher.gg',
        type: ActivityType.Custom,
      },
    ],
  });
};

export const Presence = {
  updateBotPresence,
};
