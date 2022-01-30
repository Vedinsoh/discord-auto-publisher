import { Guild } from 'discord.js-light';
import client from '#client';
import { Event } from '#structures/Event';
import { guildToString } from '#util/stringFormatters';
import logger from '#util/logger';

export default new Event('guildCreate', async (guild: Guild) => {
  if (client.cluster.blacklist.isBlacklisted(guild, { leave: true })) return;
  // if (Spam.isBlacklisted(guild, { leave: true })) return;

  const members = guild.memberCount || 'unknown';
  logger.debug(`Joined ${guildToString(guild)} with ${members} members.`);
});
