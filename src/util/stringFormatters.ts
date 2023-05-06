import type { Guild, GuildChannel, Snowflake, User } from 'discord.js';

export const userToString = (user: User): string => {
  return `${user.tag} (${user.id})`;
};

export const channelToString = (channel: GuildChannel, escapeChannel = false): string => {
  const channelName = escapeChannel ? `\`#${channel.name}\`` : `#${channel.name}`;
  return `${channelName} (${channel.id})`;
};

export const guildToString = (guild: Guild | null, guildIdFallback?: Snowflake): string => {
  if (!guild) return `unknown guild (${guildIdFallback ?? 'unknown guild ID'})`;
  return `"${guild}" (${guildIdFallback ?? guild.id})`;
};

export const guildMembersToString = (guild: Guild): string => {
  return `${guild.memberCount ?? 'unknown'} members`;
};
