import { Channel, DMChannel, Guild, PartialDMChannel, TextBasedChannel, User } from 'discord.js-light';

export const guildToString = (guild: Guild | null): string => {
  if (!guild) return 'unknown guild';
  return `"${guild.name}" (${guild.id})`;
};

export const channelToString = (channel: Channel): string => {
  const nonDmChannel = channel as Exclude<TextBasedChannel, DMChannel | PartialDMChannel>;
  if (!nonDmChannel.name) return nonDmChannel.id;
  return `#${nonDmChannel.name} (${nonDmChannel.id})`;
};

export const usersToString = (...users: User[]): string[] => {
  return users.map((user) => `${user.username}#${user.discriminator} (${user.id})`);
};
