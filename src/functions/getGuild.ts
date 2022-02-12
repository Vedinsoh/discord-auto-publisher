import client from '#client';
import { Guild } from 'discord.js-light';

export default async (guildId: string): Promise<Guild | undefined> => {
  const evalResult = await client.cluster.broadcastEval(
    (c, { guildId }) => c.guilds.cache.get(guildId),
    { context: { guildId } }
  );

  const guilds = evalResult.filter((guild) => guild !== null);
  if (guilds.length) return guilds[0];
  return undefined;
};
