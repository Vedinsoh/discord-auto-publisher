import { ActivityType } from 'discord.js';
import client from '#client';
import { Data } from '#data';
import { minToMs } from '#utils/timeConverters';

const getGuildsCount = async (): Promise<number> => {
  try {
    const clientId = client.user?.id || '';
    if (!clientId) return 0;
    const botClient = await Data.Repo.BotClients.findOne(clientId);
    return botClient?.guildsCount || 0;
  } catch (error) {
    client.logger.error(error);
    return 0;
  }
};

const getTotalGuildsCount = async (): Promise<number> => {
  try {
    const all = await Data.Repo.BotClients.findMany();
    return all.reduce((acc, c) => acc + (c.guildsCount || 0), 0);
  } catch (error) {
    client.logger.error(error);
    return 0;
  }
};

const updateGuildsCount = async () => {
  try {
    const clientId = client.user?.id || '';
    if (!clientId) return;
    const counts = (await client.cluster.fetchClientValues('guilds.cache.size')) as number[];
    const guildsCount = counts.reduce((acc, c) => acc + (c ?? 0), 0);

    if (guildsCount === 0) return;

    client.logger.debug(`Updating guilds count. Guilds: ${guildsCount}`);
    await Data.Repo.BotClients.update(clientId, { guildsCount });
  } catch (error) {
    client.logger.error(error);
  }
};

const startGuildsCountUpdateInterval = () => {
  client.logger.debug('Starting guilds count update interval');
  updateGuildsCount();
  setInterval(() => updateGuildsCount(), minToMs(15));
};

const updateBotPresence = async () => {
  const guilds = await getTotalGuildsCount();
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
  getTotalGuildsCount,
  updateGuildsCount,
  startGuildsCountUpdateInterval,
  updateBotPresence,
  startBotPresenceInterval,
};
