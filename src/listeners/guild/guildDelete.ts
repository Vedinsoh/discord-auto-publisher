import { ChannelType, Events } from 'discord.js';
import client from '#client';
import Event from '#structures/Event';
import { guildMembersToString, guildToString } from '#util/stringFormatters';

export default new Event(Events.GuildDelete, async (guild) => {
  if (await client.blacklist.has(guild.id)) return;

  const members = guildMembersToString(guild);
  const newsChannelIds = guild.channels.cache
    .filter((channel) => channel.type === ChannelType.GuildAnnouncement)
    .map((channel) => channel.id);

  client.crosspostQueue.deleteChannelsQueue(guild.id, newsChannelIds);

  client.logger.debug(`Left ${guildToString(guild)} with ${members}.`);
});
