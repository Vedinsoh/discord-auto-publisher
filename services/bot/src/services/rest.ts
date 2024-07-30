import type { Snowflake } from 'discord.js';
import { Data } from '#data';
import { logger } from '#utils/logger';

const pushCrosspost = async (channelId: Snowflake, messageId: Snowflake) => {
  try {
    await Data.API.REST.pushCrosspost(channelId, messageId);
    return;
  } catch (error) {
    logger.error(error);
  }
};

export const REST = { pushCrosspost };
