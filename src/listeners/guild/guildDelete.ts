import { Constants, Guild } from 'discord.js-light';
import { Event } from '#structures/Event';
import Blacklist from '#modules/BlacklistManager';
import { guildToString } from '#util/stringFormatters';
import logger from '#util/logger';

export default new Event(Constants.Events.GUILD_DELETE, async (guild: Guild) => {
  if (await Blacklist.isBlacklisted(guild.id)) return;

  const members = guild.memberCount || 'unknown';
  logger.debug(`Left ${guildToString(guild)} with ${members} members.`);
});
