import { Guild } from 'discord.js-light';
import client from '#client';
import { Event } from '#structures/Event';
import Spam from '#modules/SpamManager';
import logger from '#util/logger';
import { guildToString } from '#util/stringFormatters';

export default new Event('guildCreate', async (guild: Guild) => {
  if (Spam.blacklistCheck(guild, { leave: true })) return;

  const members = guild.memberCount || 'unknown';
  logger.info(`Joined ${guildToString(guild)} with ${members} members. Guilds: ${client.guilds.cache.size}`);
});
