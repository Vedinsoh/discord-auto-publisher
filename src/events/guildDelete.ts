import { Guild } from 'discord.js-light';
import client from '#client';
import { Event } from '#structures/Event';
import Spam from '#modules/SpamManager';
import { guildToString } from '#util/stringFormatters';
import logger from '#util/logger';

export default new Event('guildDelete', async (guild: Guild) => {
  if (Spam.blacklistCheck(guild)) return;

  const members = guild.memberCount || 'unknown';
  logger.info(`Left ${guildToString(guild)} with ${members} members. Guilds: ${client.guilds.cache.size}`);
});
