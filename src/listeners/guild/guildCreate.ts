import { Constants, Guild } from 'discord.js-light';
import { Event } from '#structures/Event';
import Blacklist from '#modules/BlacklistManager';
import { guildToString } from '#util/stringFormatters';
import logger from '#util/logger';
import config from '#config';

const { spam } = config;

export default new Event(Constants.Events.GUILD_CREATE, async (guild: Guild) => {
  if (await Blacklist.isBlacklisted(guild.id, { leave: spam.autoLeave })) return;

  const members = guild.memberCount || 'unknown';
  logger.debug(`Joined ${guildToString(guild)} with ${members} members.`);
});
