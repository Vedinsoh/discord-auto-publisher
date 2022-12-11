import type { Guild, GuildChannel, Snowflake } from 'discord.js';

export const channelToString = (channel: GuildChannel): string => {
  return `#${channel.name} (${channel.id})`;
};

export const guildToString = (guild: Guild | null, guildIdOverride?: Snowflake): string => {
  if (!guild) return `unknown guild (${guildIdOverride ?? 'unknown guild ID'})`;
  return `"${guild}" (${guildIdOverride ?? guild.id})`;
};

export const guildMembersToString = (guild: Guild): string => {
  return `${guild.memberCount ?? 'unknown'} members`;
};
