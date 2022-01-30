import { Guild } from 'discord.js-light';
import client from '#client';
import { Event } from '#structures/Event';
import { guildToString } from '#util/stringFormatters';
import logger from '#util/logger';

export default new Event('guildDelete', async (guild: Guild) => {
  if (await client.cluster.blacklist.isBlacklisted(guild)) return;

  const members = guild.memberCount || 'unknown';
  logger.debug(`Left ${guildToString(guild)} with ${members} members.`);
});
