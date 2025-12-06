import { Data } from 'data/index.js';
import {
  ChannelType,
  type Channel as DiscordChannel,
  type GuildChannel,
  type NewsChannel,
  type Snowflake,
} from 'discord.js';
import { logger } from 'utils/logger.js';

/**
 * Fetches complete channel data
 * @param channel The channel to fetch
 * @returns Channel data
 */
const fetchChannel = async (channel: DiscordChannel | GuildChannel) => {
  // Get the channel data if it's partial
  if (channel.partial) {
    return await channel.fetch();
  }

  return channel;
};

/**
 * Get news channel data
 * @param channel The channel to check
 * @returns News channel data or null if not a news channel
 */
const fetchNewsChannel = async (channel: DiscordChannel | GuildChannel) => {
  const fetchedChannel = await fetchChannel(channel);

  if (fetchedChannel.type !== ChannelType.GuildAnnouncement) {
    return null;
  }

  return fetchedChannel as NewsChannel;
};

/**
 * Enable auto-publishing for a channel
 * @param guildId The guild ID
 * @param channelId The channel ID
 * @returns API response
 */
const enable = async (guildId: Snowflake, channelId: Snowflake) => {
  return await Data.API.Backend.addChannel(guildId, channelId);
};

/**
 * Disable auto-publishing for a channel
 * @param guildId The guild ID
 * @param channelId The channel ID
 * @returns API response
 */
const disable = async (guildId: Snowflake, channelId: Snowflake) => {
  return await Data.API.Backend.removeChannel(guildId, channelId);
};

/**
 * Get status of a channel
 * @param guildId The guild ID
 * @param channelId The channel ID
 * @returns Channel status object with enabled flag, filters, and filter mode, or null if request fails
 */
const getStatus = async (guildId: Snowflake, channelId: Snowflake) => {
  const response = await Data.API.Backend.getChannel(guildId, channelId);

  if (!response.ok) {
    logger.error(
      `Failed to get channel status ${channelId}: ${response.status} ${response.statusText}`
    );
    return null;
  }

  const data = (await response.json()) as {
    enabled: boolean;
    channelId?: string;
    filters?: unknown[];
    filterMode?: string;
  };
  return data;
};

/**
 * Get all channels enabled for auto-publishing in a guild
 * @param guildId The guild ID
 * @returns Array of channel IDs, or null if request fails
 */
const getGuildChannels = async (guildId: Snowflake) => {
  const response = await Data.API.Backend.getGuildChannels(guildId);

  if (!response.ok) {
    logger.error(
      `Failed to get guild channels ${guildId}: ${response.status} ${response.statusText}`
    );
    return null;
  }

  const result = (await response.json()) as {
    success: boolean;
    message: string;
    data: { channelIds: string[] };
    statusCode: number;
  };
  return result.data.channelIds;
};

/**
 * Remove a channel from auto-publishing (with error handling)
 * @param guildId The guild ID
 * @param channelId The channel ID
 * @returns void
 */
const remove = async (guildId: Snowflake, channelId: Snowflake) => {
  try {
    const response = await Data.API.Backend.removeChannel(guildId, channelId);

    if (!response.ok) {
      logger.error(
        `Failed to delete channel ${channelId}: ${response.status} ${response.statusText}`
      );
      return;
    }

    logger.info(`Successfully deleted channel ${channelId}`);
  } catch (error) {
    logger.error(error, `Error deleting channel ${channelId}`);
  }
};

export const Channel = {
  fetchChannel,
  fetchNewsChannel,
  enable,
  disable,
  getStatus,
  getGuildChannels,
  remove,
};
