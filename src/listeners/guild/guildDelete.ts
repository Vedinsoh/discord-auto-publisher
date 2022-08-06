import { Constants } from 'discord.js-light';
import Blacklist from '#modules/BlacklistManager';
import { Event } from '#structures/Event';
import logger from '#util/logger';
import { guildToString } from '#util/stringFormatters';

export default new Event(Constants.Events.GUILD_DELETE, async (guild) => {
  if (await Blacklist.isBlacklisted(guild.id)) return;

  const members = guild.memberCount || 'unknown';
  logger.debug(`Left ${guildToString(guild)} with ${members} members.`);
});
