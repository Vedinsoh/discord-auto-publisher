import type { Edition } from '@ap/api-types';
import type { Snowflake } from 'discord-api-types/globals';
import {
  type APIChannel,
  type APIGuildMember,
  type APIRole,
  OverwriteType,
  PermissionFlagsBits,
  Routes,
} from 'discord-api-types/v10';
import { Discord } from './discord.js';

/** Permissions a bot needs to crosspost in a channel */
export const PUBLISH_PERMISSIONS =
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.ManageMessages;

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
 * `{channelId → canPublish}` for the given channels, evaluated for an
 * edition's bot via its proxy (two REST calls: guild roles + bot member).
 */
const getCanPublishMap = async (
  edition: Edition,
  guildId: Snowflake,
  channels: APIChannel[]
): Promise<Record<string, boolean>> => {
  const [roles, member] = await Promise.all([
    Discord.cachedGet<APIRole[]>(edition, Routes.guildRoles(guildId)),
    Discord.getBotUserId(edition).then(id =>
      Discord.cachedGet<APIGuildMember>(edition, Routes.guildMember(guildId, id))
    ),
  ]);

  const map: Record<string, boolean> = {};
  for (const channel of channels) {
    const permissions = computeChannelPermissions(guildId, member, roles, channel);
    map[channel.id] = (permissions & PUBLISH_PERMISSIONS) === PUBLISH_PERMISSIONS;
  }

  return map;
};

export const BotPermissions = {
  getCanPublishMap,
};
