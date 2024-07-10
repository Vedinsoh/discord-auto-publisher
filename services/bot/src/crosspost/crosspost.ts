import { DiscordAPIError, NewsChannel } from 'discord.js';
import { DiscordjsError } from 'discord.js';
import { DiscordjsErrorCodes } from 'discord.js';
import crypto from 'node:crypto';
import client from '#client';
import safeErrorCodes from '#constants/safeErrorCodes';
import type { ReceivedMessage } from '#types/MessageTypes';
import { channelToString, guildToString } from '#util/stringFormatters';

const crosspost = async (message: ReceivedMessage) => {
  const channel = message.channel as NewsChannel;

  if (await client.antiSpam.isFlagged(message.channelId)) {
    client.antiSpam.increment(channel.id);
    return;
  }

  return message
    .crosspost()
    .then(() => {
      client.cache.crossposts.add(message);
      client.logger.debug(
        `Published ${message.id} in ${channelToString(channel)} - ${guildToString(message.guild, channel.guildId)}`
      );
    })
    .catch((error: DiscordAPIError | DiscordjsError | unknown) => {
      if (error instanceof DiscordjsError) {
        if (error.code === DiscordjsErrorCodes.ChannelNotCached) {
          return;
        }
      }

      if (error instanceof DiscordAPIError) {
        const code = typeof error.code === 'string' ? parseInt(error.code) : error.code;
        if (error.status === 403) {
          client.cache.requestLimits.add(crypto.randomUUID(), error.status);
        }
        if (safeErrorCodes.includes(code)) return;
      }

      client.logger.error(error);
    });
};

export default crosspost;
