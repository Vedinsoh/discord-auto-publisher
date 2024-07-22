import { REST, RESTEvents } from '@discordjs/rest';
import { Snowflake } from 'discord-api-types/globals';
import { Routes } from 'discord-api-types/v10';

import { env } from '@/utils/config';

// Initialize Discord REST client
const rest = new REST({
  version: '10',
  globalRequestsPerSecond: 41, // TODO adjust this parameter
}).setToken(env.DISCORD_TOKEN);

/**
 * Crossposts a message in announcement channel
 * @param channelId ID of the channel
 * @param messageId ID of the message
 * @returns Promise
 */
const crosspost = async (channelId: Snowflake, messageId: Snowflake) => {
  return rest.post(Routes.channelMessageCrosspost(channelId, messageId));
};

// TODO move to the appropriate place
// rest.on(RESTEvents.Debug, (data) => {
//   const rateLimited = is429(data);
//   if (rateLimited) this.cache.requestLimits.add(crypto.randomUUID(), 429);

//   const parsedParams = parseRestSublimit(data);
//   if (parsedParams) this.antiSpam.add(parsedParams);
// });

export const Discord = {
  crosspost,
};
