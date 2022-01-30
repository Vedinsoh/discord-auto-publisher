import { Guild } from 'discord.js-light';
import client from '#client';
import { Event } from '#structures/Event';
import { guildToString } from '#util/stringFormatters';
import logger from '#util/logger';
import { spam } from '#config';

export default new Event('guildCreate', async (guild: Guild) => {
  if (await client.cluster.blacklist.isBlacklisted(guild, { leave: spam.autoLeave })) return;

  const members = guild.memberCount || 'unknown';
  logger.debug(`Joined ${guildToString(guild)} with ${members} members.`);
});
