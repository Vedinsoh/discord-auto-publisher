import { ActivityType } from 'discord.js';
import client from '#client';
import { minToMs } from '#utils/timeConverters';

const getGuildsCount = async (): Promise<number> => {
  try {
    const counts = (await client.cluster.fetchClientValues('guilds.cache.size')) as number[];
    return counts.reduce((acc, count) => acc + (count ?? 0), 0);
  } catch (error) {
    client.logger.error(error);
    return 0;
  }
};

const updateBotPresence = async () => {
  const guilds = await getGuildsCount();
  if (!guilds) return;

  client.logger.debug(`Updating bot presence. Guilds: ${guilds}`);

  client.user?.setPresence({
    activities: [
      {
        name: `${guilds} server${guilds > 1 ? 's' : ''}`,
        type: ActivityType.Watching,
      },
    ],
  });
};

const startBotPresenceInterval = () => {
  client.logger.debug('Starting bot presence interval');
  setInterval(() => updateBotPresence(), minToMs(15));
};

export const Presence = {
  getGuildsCount,
  updateBotPresence,
  startBotPresenceInterval,
};
