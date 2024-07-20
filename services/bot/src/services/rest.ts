import type { Snowflake } from 'discord.js';
import { Data } from '#data';

const pushCrosspost = async (channelId: Snowflake, messageId: Snowflake) => {
  return Data.API.REST.pushCrosspost(channelId, messageId);
};

export const REST = { pushCrosspost };
