import { REST } from '@discordjs/rest';
import { Routes, Snowflake } from 'discord-api-types/v10';

import { env } from '@/utils/config';

// Initializes the Discord REST client
const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

/**
 * Crossposts a message in announcement channel
 * @param channelId ID of the channel
 * @param messageId ID of the message
 * @returns Promise
 */
const crosspost = async (channelId: Snowflake, messageId: Snowflake) => {
  return rest.post(Routes.channelMessageCrosspost(channelId, messageId));
};

export const Discord = {
  crosspost,
};
