import { Keys } from '@ap/redis';
import { Data } from 'data/index.js';
import type { Snowflake } from 'discord-api-types/globals';
import {
  type APIChannel,
  type APIGuildMember,
  type APIRole,
  OverwriteType,
  PermissionFlagsBits,
  type RESTGetAPIUserResult,
  Routes,
} from 'discord-api-types/v10';
import { logger } from 'utils/logger.js';
import { Discord } from './discord.js';

/**
 * MIGRATION: Legacy-guild migrate-modal preselection data — computes whether
 * the bot can publish in each announcement channel. Removed entirely at sunset
 * together with the LegacyGuildPerms Redis DB.
 */

const CACHE_TTL_SECONDS = 300;

const REQUIRED_PERMISSIONS =
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.ManageMessages;

let botUserId: Snowflake | undefined;

const getBotUserId = async (): Promise<Snowflake> => {
  if (!botUserId) {
    const user = (await Discord.rest.get(Routes.user())) as RESTGetAPIUserResult;
    botUserId = user.id;
  }
  return botUserId;
};

/**
 * Effective channel permissions for a member: guild-level role union, then
 * @everyone / role / member overwrites (Administrator bypasses everything).
 */
const computeChannelPermissions = (
  guildId: Snowflake,
  member: APIGuildMember,
  roles: APIRole[],
  channel: APIChannel
): bigint => {
  const roleMap = new Map(roles.map(r => [r.id, r]));

  let base = BigInt(roleMap.get(guildId)?.permissions ?? 0);
  for (const roleId of member.roles) {
    base |= BigInt(roleMap.get(roleId)?.permissions ?? 0);
  }

  if ((base & PermissionFlagsBits.Administrator) === PermissionFlagsBits.Administrator) {
    return ~0n;
  }

  const overwrites =
    'permission_overwrites' in channel ? (channel.permission_overwrites ?? []) : [];

  let permissions = base;

  const everyoneOverwrite = overwrites.find(o => o.type === OverwriteType.Role && o.id === guildId);
  if (everyoneOverwrite) {
    permissions &= ~BigInt(everyoneOverwrite.deny);
    permissions |= BigInt(everyoneOverwrite.allow);
  }

  let roleAllow = 0n;
  let roleDeny = 0n;
  for (const overwrite of overwrites) {
    if (overwrite.type === OverwriteType.Role && member.roles.includes(overwrite.id)) {
      roleAllow |= BigInt(overwrite.allow);
      roleDeny |= BigInt(overwrite.deny);
    }
  }
  permissions &= ~roleDeny;
  permissions |= roleAllow;

  const memberOverwrite = overwrites.find(
    o => o.type === OverwriteType.Member && o.id === member.user.id
  );
  if (memberOverwrite) {
    permissions &= ~BigInt(memberOverwrite.deny);
    permissions |= BigInt(memberOverwrite.allow);
  }

  return permissions;
};

/**
 * `{channelId → canPublish}` for the given announcement channels, Redis-cached
 * per guild (5 min) so dashboard refresh-spam can't fan out REST calls.
 * Staleness is cosmetic — this only drives modal checkbox preselection; the
 * migrate endpoint re-validates server-side.
 * @param guildId ID of the guild
 * @param announcementChannels Announcement channels (with permission_overwrites)
 */
const getCanPublishMap = async (
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

  const [roles, member] = await Promise.all([
    Discord.rest.get(Routes.guildRoles(guildId)) as Promise<APIRole[]>,
    getBotUserId().then(
      id => Discord.rest.get(Routes.guildMember(guildId, id)) as Promise<APIGuildMember>
    ),
  ]);

  const map: Record<string, boolean> = {};
  for (const channel of announcementChannels) {
    const permissions = computeChannelPermissions(guildId, member, roles, channel);
    map[channel.id] = (permissions & REQUIRED_PERMISSIONS) === REQUIRED_PERMISSIONS;
  }

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
