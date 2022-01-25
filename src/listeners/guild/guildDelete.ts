import { Guild } from 'discord.js-light';
import { Event } from '#structures/Event';
import Spam from '#modules/SpamManager';
import { guildToString } from '#util/stringFormatters';
import logger from '#util/logger';

export default new Event('guildDelete', async (guild: Guild) => {
  if (Spam.isBlacklisted(guild)) return;

  const members = guild.memberCount || 'unknown';
  logger.debug(`Left ${guildToString(guild)} with ${members} members.`);
});
