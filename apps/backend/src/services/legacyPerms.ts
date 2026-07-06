import type { Edition } from '@ap/api-types';
import { Keys } from '@ap/redis';
import { Data } from 'data/index.js';
import type { Snowflake } from 'discord-api-types/globals';
import type { APIChannel } from 'discord-api-types/v10';
import { logger } from 'utils/logger.js';
import { BotPermissions } from './botPermissions.js';

/**
 * MIGRATION: Legacy-guild migrate-modal preselection data — computes whether
 * the managing edition's bot can publish in each announcement channel.
 * Removed entirely at sunset together with the LegacyGuildPerms Redis DB.
 */

const CACHE_TTL_SECONDS = 300;

/**
 * `{channelId → canPublish}` for the given announcement channels, Redis-cached
 * per guild (5 min) so dashboard refresh-spam can't fan out REST calls.
 * Staleness is cosmetic — this only drives modal checkbox preselection; the
 * migrate endpoint re-validates server-side.
 * @param edition managing edition whose bot is evaluated
 * @param guildId ID of the guild
 * @param announcementChannels Announcement channels (with permission_overwrites)
 */
const getCanPublishMap = async (
  edition: Edition,
  guildId: Snowflake,
  announcementChannels: APIChannel[]
): Promise<Record<string, boolean>> => {
  const cacheKey = `${Keys.LegacyPerms}:${guildId}`;

  try {
    const cached = await Data.Drivers.Redis.LegacyGuildPerms.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as Record<string, boolean>;
    }
  } catch (error) {
    logger.error(error);
  }

  const map = await BotPermissions.getCanPublishMap(edition, guildId, announcementChannels);

  try {
    await Data.Drivers.Redis.LegacyGuildPerms.set(
      cacheKey,
      JSON.stringify(map),
      'EX',
      CACHE_TTL_SECONDS
    );
  } catch (error) {
    logger.error(error);
  }

  return map;
};

export const LegacyPerms = {
  getCanPublishMap,
};
