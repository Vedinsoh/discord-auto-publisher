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
 * @returns API response with status codes for handler to process
 */
const enable = async (guildId: Snowflake, channelId: Snowflake) => {
  return await Data.API.Backend.addChannel(guildId, channelId);
};

/**
 * Disable auto-publishing for a channel
 * @param channelId The channel ID
 * @returns true if successful, false otherwise
 */
const disable = async (channelId: Snowflake) => {
  try {
    const response = await Data.API.Backend.removeChannel(channelId);

    if (!response.ok) {
      logger.error(
        `Failed to disable channel ${channelId}: ${response.status} ${response.statusText}`
      );
      return false;
    }

    logger.info(`Disabled channel ${channelId}`);
    return true;
  } catch (error) {
    logger.error(error, `Error disabling channel ${channelId}`);
    return false;
  }
};

/**
 * Get status of a channel
 * @param channelId The channel ID
 * @returns Channel status object with enabled flag, filters, and filter mode, or null if request fails
 */
const getStatus = async (channelId: Snowflake) => {
  try {
    const response = await Data.API.Backend.getChannel(channelId);

    if (!response.ok) {
      logger.error(
        `Failed to get channel status ${channelId}: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const result = (await response.json()) as {
      status: number;
      data: {
        enabled: boolean;
        channelId?: string;
        filters?: unknown[];
        filterMode?: string;
      };
      message: string;
    };
    return result.data;
  } catch (error) {
    logger.error(error, `Error getting channel status ${channelId}`);
    return null;
  }
};

/**
 * Get all channels enabled for auto-publishing in a guild
 * @param guildId The guild ID
 * @returns Array of channel IDs, or null if request fails
 */
const getGuildChannels = async (guildId: Snowflake) => {
  try {
    const response = await Data.API.Backend.getGuildChannels(guildId);

    if (!response.ok) {
      logger.error(
        `Failed to get guild channels ${guildId}: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const result = (await response.json()) as {
      status: number;
      data: { channelIds: string[] };
      message: string;
    };
    return result.data.channelIds;
  } catch (error) {
    logger.error(error, `Error getting guild channels ${guildId}`);
    return null;
  }
};

export const Channel = {
  fetchChannel,
  fetchNewsChannel,
  enable,
  disable,
  getStatus,
  getGuildChannels,
};
