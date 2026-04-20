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
  rejectOnRateLimit: (data) => {
    // Reject only shared scope (per-channel resource limit = 10/hr crosspost sublimit)
    // User/global scope rate limits are auto-retried by discord.js (route-level ~10s, global ~50ms)
    // Per Discord docs: shared 429s are NOT counted against Cloudflare ban
    const isPostMethod = data.method.toUpperCase() === RequestMethod.Post;
    const isCrosspostRoute = data.route === Constants.API.Discord.routes.crosspost;
    const isSublimited = data.scope === 'shared' && data.sublimitTimeout > 0;
    return isPostMethod && isCrosspostRoute && isSublimited;
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

export const Discord = {
  rest,
  crosspost,
};
