import { Events } from 'discord.js';
import client from '#client';
import config from '#config';
import Event from '#structures/Event';
import { guildMembersToString, guildToString } from '#util/stringFormatters';

const { antiSpam } = config;

export default new Event(Events.GuildCreate, async (guild) => {
  if (await client.blacklist.has(guild.id)) {
    if (antiSpam.autoLeave) client.blacklist.leaveGuild(guild.id);
    return;
  }

  const members = guildMembersToString(guild);
  client.logger.debug(`Joined ${guildToString(guild)} with ${members}.`);
});
