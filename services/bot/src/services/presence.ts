import { ActivityType } from 'discord.js';
import client from '#client';
import { Data } from '#data';
import { minToMs } from '#utils/timeConverters';

/**
 * Get the guilds count for the bot
 * @returns Guilds count
 */
const getGuildsCount = async () => {
  try {
    const clientId = client.user?.id || '';
    const res = await Data.API.REST.getGuildsCount(clientId);
    // TODO types
    const body = (await res.json()) as any;

    return body.data.count || 0;
  } catch (error) {
    client.logger.error(error);
    return 0;
  }
};

/**
 * Get the total guilds count for all bots
 * @returns Total guilds count
 */
const getTotalGuildsCount = async () => {
  try {
    const res = await Data.API.REST.getTotalGuildsCount();
    // TODO types
    const body = (await res.json()) as any;

    return body.data.count || 0;
  } catch (error) {
    client.logger.error(error);
    return 0;
  }
};

/**
 * Update the guilds count for the bot
 * @returns Void
 */
const updateGuildsCount = async () => {
  try {
    const clientId = client.user?.id || '';
    const guildsCount = await client.cluster
      .broadcastEval(`this.guilds.cache.size`)
      .then((results: number[]) => results.reduce((p: number, n: number) => p + n));

    if (guildsCount === 0) return;

    client.logger.debug(`Updating guilds count. Guilds: ${guildsCount}`);

    await Data.API.REST.updateGuildsCount(clientId, guildsCount);
  } catch (error) {
    client.logger.error(error);
  }
};

/**
 * Start the interval to update the guilds count
 */
const startGuildsCountUpdateInterval = () => {
  client.logger.debug('Starting guilds count update interval');
  setInterval(() => updateGuildsCount(), minToMs(15));
};

/**
 * Update the bot presence
 */
const updateBotPresence = async () => {
  const guilds = await getTotalGuildsCount();

  if (!guilds) {
    return;
  }

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

/**
 * Start the interval to update the bot presence
 */
const startBotPresenceInterval = () => {
  client.logger.debug('Starting bot presence interval');
  setInterval(() => updateBotPresence(), minToMs(15));
};

export const Presence = {
  getGuildsCount,
  getTotalGuildsCount,
  startGuildsCountUpdateInterval,
  updateGuildsCount,
  updateBotPresence,
  startBotPresenceInterval,
};
