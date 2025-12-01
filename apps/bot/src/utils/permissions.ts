import {
  type GuildMember,
  type NewsChannel,
  PermissionsBitField,
  type PermissionsString,
} from 'discord.js';

export interface PermissionCheck {
  name: string;
  has: boolean;
}

export interface PermissionCheckResult {
  hasAll: boolean;
  permissions: PermissionCheck[];
  missing: PermissionCheck[];
}

const REQUIRED_PERMISSIONS: PermissionsString[] = [
  'ViewChannel',
  'SendMessages',
  'ManageMessages',
  'ReadMessageHistory',
];

const PERMISSION_NAMES: Partial<Record<PermissionsString, string>> = {
  ViewChannel: 'View Channel',
  SendMessages: 'Send Messages',
  ManageMessages: 'Manage Messages',
  ReadMessageHistory: 'Read Message History',
};

/**
 * Check if bot has all required permissions in a channel
 * @param botMember The bot's guild member
 * @param channel The channel to check permissions in
 * @returns Permission check result
 */
export const checkChannelPermissions = (
  botMember: GuildMember,
  channel: NewsChannel
): PermissionCheckResult => {
  const permissionsBitfield = botMember.permissionsIn(channel);

  const permissions: PermissionCheck[] = REQUIRED_PERMISSIONS.map(perm => ({
    name: PERMISSION_NAMES[perm] ?? perm,
    has: permissionsBitfield.has(PermissionsBitField.Flags[perm]),
  }));

  const missing = permissions.filter(p => !p.has);
  const hasAll = missing.length === 0;

  return {
    hasAll,
    permissions: permissions.sort((a, b) => Number(a.has) - Number(b.has)),
    missing,
  };
};
