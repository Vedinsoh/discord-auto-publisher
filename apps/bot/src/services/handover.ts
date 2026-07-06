import { config } from '@ap/config';
import { Data } from 'data/index.js';
import type { Snowflake } from 'discord.js';
import { logger } from 'utils/logger.js';

/**
 * Premium handover latch (ADR 0006): while the free bot still covers a guild,
 * the backend keeps a `PremiumPending` Redis marker and the premium bot idles.
 * The hot path checks the marker per message only while pending; the first
 * absent read latches "active" in memory permanently (cleared on guildDelete).
 * The free bot never enters this code — isActive is unconditionally true.
 */
const activeLatch = new Set<Snowflake>();

/**
 * Guilds whose registerNewGuild call is still in flight. The backend writes
 * the pending marker during registration — an absent-marker read before the
 * register response lands must not latch "active" (it would race the marker
 * write and publish alongside the free bot for the whole pending period).
 */
const registrationInFlight = new Set<Snowflake>();

const beginRegistration = (guildId: Snowflake): void => {
  if (!config.isPremiumInstance) return;
  registrationInFlight.add(guildId);
};

const endRegistration = (guildId: Snowflake): void => {
  registrationInFlight.delete(guildId);
};

/**
 * Whether this bot should publish in the guild. Idles (without latching)
 * while its own registration is in flight; fails open on Redis errors
 * without latching: worst case is double coverage for a pending guild, and
 * the proxy worker classifies the loser's crosspost as already_done.
 */
const isActive = async (guildId: Snowflake): Promise<boolean> => {
  if (!config.isPremiumInstance) return true;
  if (activeLatch.has(guildId)) return true;
  if (registrationInFlight.has(guildId)) return false;

  try {
    if (await Data.Cache.PremiumPending.isPending(guildId)) return false;
  } catch (error) {
    logger.warn(
      { event: 'handover.marker_read_failed', guildId, err: error },
      'Failed to read handover marker, assuming active without latching'
    );
    return true;
  }

  activeLatch.add(guildId);
  return true;
};

/**
 * Permission-change ping: while the guild is pending, ask the backend to
 * re-evaluate the handover (it swaps once every channel passes).
 */
const pingIfPending = async (guildId: Snowflake): Promise<void> => {
  if (!config.isPremiumInstance) return;
  if (await isActive(guildId)) return;

  try {
    await Data.API.Backend.pingHandoverEvaluate(guildId);
  } catch (error) {
    logger.warn(
      { event: 'handover.ping_failed', guildId, err: error },
      'Failed to ping handover evaluation'
    );
  }
};

/** Clears the latch when the bot leaves a guild (a re-invite starts un-latched) */
const onGuildDelete = (guildId: Snowflake): void => {
  activeLatch.delete(guildId);
  registrationInFlight.delete(guildId);
};

export const Handover = {
  isActive,
  pingIfPending,
  beginRegistration,
  endRegistration,
  onGuildDelete,
};
