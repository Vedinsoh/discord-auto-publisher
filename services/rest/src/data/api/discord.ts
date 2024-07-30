import { RequestMethod, REST } from '@discordjs/rest';
import { Snowflake } from 'discord-api-types/globals';
import { Routes } from 'discord-api-types/v10';

import { Constants } from '@/constants';
import { Services } from '@/services';
import { env } from '@/utils/config';

// Initialize Discord REST client
const rest = new REST({
  version: '10',
  globalRequestsPerSecond: 35, // TODO adjust this parameter
  rejectOnRateLimit: (data) => {
    // Reject crosspost requests on rate limit to obtain sublimit data
    const isPostMethod = data.method.toUpperCase() === RequestMethod.Post;
    const isCrosspostRoute = Constants.API.Discord.routes.crosspost === data.route;
    const isGlobal = data.global;

    return isPostMethod && isCrosspostRoute && !isGlobal;
  },
}).setToken(env.DISCORD_TOKEN);

/**
 * Crossposts a message in announcement channel
 * @param channelId ID of the channel
 * @param messageId ID of the message
 * @returns Promise
 */
const crosspost = async (channelId: Snowflake, messageId: Snowflake) => {
  try {
    Services.Logger.debug(`Crossposting message ${messageId} in channel ${channelId}`);
    return rest.post(Routes.channelMessageCrosspost(channelId, messageId));
  } catch (error) {
    Services.Logger.error(error);
  }
};

export const Discord = {
  rest,
  crosspost,
};
