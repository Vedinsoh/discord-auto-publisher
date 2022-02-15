import client from '#client';
import { Snowflake } from 'discord-api-types';
import { Guild } from 'discord.js-light';

export default async (guildId: Snowflake): Promise<Guild | undefined> => {
  const evalResult = await client.cluster.broadcastEval(
    (c, { guildId }) => c.guilds.cache.get(guildId),
    { context: { guildId } }
  );

  const guilds = evalResult.filter((guild) => guild !== null);
  if (guilds.length) return guilds[0];
  return undefined;
};
