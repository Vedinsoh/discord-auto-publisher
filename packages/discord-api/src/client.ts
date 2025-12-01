import type { Logger } from '@ap/logger';
import { REST, RequestMethod } from '@discordjs/rest';
import type { Snowflake } from 'discord-api-types/globals';
import { Routes } from 'discord-api-types/v10';

export const createDiscordClient = (
  token: string,
  logger: Logger,
  proxyUrl = 'http://discord-proxy:8080/api'
) => {
  const rest = new REST({
    version: '10',
    api: proxyUrl,
    globalRequestsPerSecond: 45,
    rejectOnRateLimit: data => {
      const isPostMethod = data.method.toUpperCase() === RequestMethod.Post;
      const isCrosspostRoute = Routes.channelMessageCrosspost(':id', ':id') === data.route;
      const isGlobal = data.global;

      return isPostMethod && isCrosspostRoute && !isGlobal;
    },
  }).setToken(token);

  const crosspost = async (channelId: Snowflake, messageId: Snowflake) => {
    try {
      logger.debug(`Crossposting message ${messageId} in channel ${channelId}`);
      return rest.post(Routes.channelMessageCrosspost(channelId, messageId));
    } catch (error) {
      logger.error(error);
    }
  };

  return { rest, crosspost };
};
