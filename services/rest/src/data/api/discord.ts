import { RequestMethod, REST } from '@discordjs/rest';
import { Snowflake } from 'discord-api-types/globals';
import { Routes } from 'discord-api-types/v10';

import { Constants } from '@/constants';
import { Services } from '@/services';
import { env } from '@/utils/config';

// Initialize Discord REST client
const rest = new REST({
  api: 'http://discord-proxy:8080/api',
  version: '10',
  globalRequestsPerSecond: 45,
  rejectOnRateLimit: (data) => {
    // Reject only sublimit (10/hr) rate limits — route-level limits are auto-retried by discord.js
    const isPostMethod = data.method.toUpperCase() === RequestMethod.Post;
    const isCrosspostRoute = data.route === Constants.API.Discord.routes.crosspost;
    // Post-429: discord.js correctly passes scope='shared' and sublimitTimeout>0
    const isSublimit = data.scope === 'shared' && data.sublimitTimeout > 0;
    // Pre-flight: discord.js always hardcodes sublimitTimeout=0 and scope='user' in the
    // while(limited) loop, so use timeToReset as a proxy — sublimits have long resets
    // (minutes-to-hours), route-level limits reset in <10s
    const isPreflightSublimit = data.timeToReset > 60_000;
    return isPostMethod && isCrosspostRoute && (isSublimit || isPreflightSublimit);
  },
}).setToken(env.DISCORD_TOKEN);

/**
 * Crossposts a message in announcement channel
 * @param channelId ID of the channel
 * @param messageId ID of the message
 * @returns Promise
 */
const crosspost = async (channelId: Snowflake, messageId: Snowflake) => {
    Services.Logger.debug(`Crossposting message ${messageId} in channel ${channelId}`);
    return rest.post(Routes.channelMessageCrosspost(channelId, messageId));
};

/**
 * Get REST client stats (active buckets, global rate limit state)
 */
const getInfo = () => ({
  globalRemaining: rest.globalRemaining,
  handlers: rest.handlers.size,
  activeHandlers: rest.handlers.filter((h) => !h.inactive).size,
  hashes: rest.hashes.size,
});

export const Discord = {
  rest,
  crosspost,
  getInfo,
};
