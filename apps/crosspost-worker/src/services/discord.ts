import { REST, RequestMethod } from '@discordjs/rest';
import type { Snowflake } from 'discord-api-types/globals';
import { Routes } from 'discord-api-types/v10';
import { env } from 'lib/config/env.js';
import { logger } from 'utils/logger.js';

const rest = new REST({
  api: 'http://discord-proxy:8080/api',
  rejectOnRateLimit: data => {
    const isPostMethod = data.method.toUpperCase() === RequestMethod.Post;
    const isCrosspostRoute = Routes.channelMessageCrosspost(':id', ':id') === data.route;
    const isGlobal = data.global;

    return isPostMethod && isCrosspostRoute && !isGlobal;
  },
}).setToken(env.DISCORD_TOKEN);

const crosspost = async (channelId: Snowflake, messageId: Snowflake) => {
  try {
    logger.debug(`Crossposting message ${messageId} in channel ${channelId}`);
    return rest.post(Routes.channelMessageCrosspost(channelId, messageId));
  } catch (error) {
    logger.error(error);
  }
};

export const Discord = { rest, crosspost };
