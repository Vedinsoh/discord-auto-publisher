import type { Guild, Snowflake } from 'discord.js';
import client from '#client';

const getGuild = async (guildId: Snowflake): Promise<Guild | undefined> => {
  const evalResult = (await client.cluster //
    .broadcastEval((c, { guildId }) => c.guilds.cache.get(guildId), {
      context: { guildId },
    })) as (Guild | undefined)[];

  return evalResult.find((guild) => guild);
};

export default getGuild;
