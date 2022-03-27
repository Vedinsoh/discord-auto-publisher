import client from '#client';
import { Guild, Snowflake } from 'discord.js-light';

export default async (guildId: Snowflake): Promise<Guild | undefined> => {
  const evalResult = await client.cluster.broadcastEval(
    (c, { guildId }) => c.guilds.cache.get(guildId),
    { context: { guildId } }
  ) as (Guild | undefined)[];

  const guilds = evalResult.filter((guild) => guild !== null);
  if (guilds.length) return guilds[0];
  return undefined;
};
