import { channel, db, guild } from '@ap/database';
import { Keys } from '@ap/redis';
import { Data } from 'data/index.js';
import type { Snowflake } from 'discord-api-types/globals';
import { type APIChannel, ChannelType, Routes } from 'discord-api-types/v10';
import { eq } from 'drizzle-orm';
import { alerter } from 'utils/alerts.js';
import { logger } from 'utils/logger.js';
import { Discord } from './discord.js';
import { PublishState } from './publishState.js';

/**
 * Premium handover: while the free bot is present, the premium bot idles behind
 * a `PremiumPending` Redis marker (its hot path checks it per message until the
 * first absent read latches "active"). The swap — marker delete + free-bot
 * leave — happens only once the premium bot can publish in every relevant
 * channel, so crossposting never gains a permission gap. See ADR 0006.
 */

const key = (guildId: Snowflake) => `${Keys.PremiumPending}:${guildId}`;

const isPending = async (guildId: Snowflake): Promise<boolean> =>
  (await Data.Drivers.Redis.PremiumPending.exists(key(guildId))) === 1;

const setPending = async (guildId: Snowflake): Promise<void> => {
  await Data.Drivers.Redis.PremiumPending.set(key(guildId), '1');
  logger.info(`Premium handover pending for guild ${guildId}`);
};

/** Idempotent; called on swap and whenever either bot's presence ends mid-pending */
const clearPending = async (guildId: Snowflake): Promise<void> => {
  await Data.Drivers.Redis.PremiumPending.del(key(guildId));
};

/**
 * Channels the premium bot cannot publish in yet, measured against the free
 * bot's ACTUAL coverage: a channel the free bot itself cannot publish in
 * (often deliberately excluded by the admin) must neither gate the swap nor
 * force the admin to grant access there. Migrated guilds: registered channels
 * only; legacy guilds: every announcement channel (they all auto-publish).
 * Channels registered but no longer existing are ignored.
 */
const getBlockedChannelIds = async (guildId: Snowflake): Promise<Snowflake[]> => {
  const announcementChannels = (
    await Discord.cachedGet<APIChannel[]>('premium', Routes.guildChannels(guildId))
  ).filter(c => c.type === ChannelType.GuildAnnouncement);

  const [guildRow] = await db
    .select({ migratedAt: guild.migratedAt })
    .from(guild)
    .where(eq(guild.guildId, guildId))
    .limit(1);

  let targets = announcementChannels;
  if (guildRow?.migratedAt) {
    const registered = await db
      .select({ channelId: channel.channelId })
      .from(channel)
      .where(eq(channel.guildId, guildId));
    const registeredIds = new Set(registered.map(r => r.channelId));
    targets = announcementChannels.filter(c => registeredIds.has(c.id));
  }

  if (targets.length === 0) return [];

  const [premiumMap, freeMap] = await Promise.all([
    PublishState.getEditionMap(guildId, 'premium', targets),
    PublishState.getEditionMap(guildId, 'free', targets),
  ]);
  return targets
    .filter(c => freeMap[c.id]?.canPublish && !premiumMap[c.id]?.canPublish)
    .map(c => c.id);
};

/**
 * Swap: delete the marker (premium bot latches active on its next read), then
 * have the free bot leave. A failed leave means seconds-to-minutes of double
 * coverage (duplicates classify as `already_done`) — alert, don't roll back.
 */
const swap = async (guildId: Snowflake): Promise<void> => {
  await clearPending(guildId);
  logger.info(`Premium handover swapped for guild ${guildId}`);

  const left = await Discord.leaveGuild('free', guildId);
  if (!left) {
    alerter.send(`handover-free-leave-failed:${guildId}`, {
      title: 'Handover free-bot leave failed',
      description: `Premium handover for guild ${guildId} swapped, but the free bot failed to leave. Both bots are covering the guild (duplicates classify as already_done). Investigate the free proxy and remove the free bot manually if it persists.`,
    });
  }
};

/**
 * Re-evaluates a pending handover (premium join, permission-change pings from
 * the premium bot, dashboard loads) and swaps when every channel passes.
 * No-op when the guild is not pending.
 */
const evaluate = async (guildId: Snowflake): Promise<void> => {
  if (!(await isPending(guildId))) return;

  try {
    const blocked = await getBlockedChannelIds(guildId);
    if (blocked.length > 0) {
      logger.debug(
        `Premium handover for guild ${guildId} still pending (${blocked.length} channels blocked)`
      );
      return;
    }
  } catch (error) {
    logger.warn(error, `Premium handover evaluation failed for guild ${guildId}; staying pending`);
    return;
  }

  await swap(guildId);
};

export const Handover = {
  isPending,
  setPending,
  clearPending,
  getBlockedChannelIds,
  evaluate,
};
