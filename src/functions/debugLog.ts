import { GuildChannel } from 'discord.js-light';
import logger from '#util/logger';
import { channelToString, guildToString } from '#util/stringFormatters';
import config from '#config';

export default (channel: GuildChannel, reason: string, count: number): void => {
  if (config.log.loggingLevel !== 'debug') return;

  const { guild } = channel;
  let entry = '';

  const logAssets = {
    guild: `Guild: ${guildToString(guild)}, owner: ${guild.ownerId}`,
    channel: `Channel: ${channelToString(channel)}`,
  };

  // const addAsset = (...assets: string[]) => assets.forEach(asset => entry += `\n${logAssets[asset]}`);

  entry +=
    reason === 'rateLimited'
      ? `${channelToString(channel)} - ${guildToString(guild)} is being rate limited!${
          count ? ` (${10 + count}/${config.spam.messagesHourlyLimit})` : ''
        }`
      : reason;

  // if (reason !== 'rateLimited') addAsset('server', 'channel');
  logger.debug(entry);
};
