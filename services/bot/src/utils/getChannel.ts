import type { NewsChannel, Snowflake } from 'discord.js';
import client from '#client';

const getChannel = async (channelId: Snowflake): Promise<NewsChannel | undefined> => {
  const evalResult = (await client.cluster //
    .broadcastEval((c, { channelId }) => c.channels.fetch(channelId), {
      context: { channelId },
    })) as (NewsChannel | undefined)[];

  return evalResult.find((channel) => channel !== null);
};

export default getChannel;
