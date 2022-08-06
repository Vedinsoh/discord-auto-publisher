import { Constants } from 'discord.js-light';
import config from '#config';
import Blacklist from '#modules/BlacklistManager';
import { Event } from '#structures/Event';
import logger from '#util/logger';
import { guildToString } from '#util/stringFormatters';

const { spam } = config;

export default new Event(Constants.Events.GUILD_CREATE, async (guild) => {
  if (await Blacklist.isBlacklisted(guild.id, { leave: spam.autoLeave })) return;

  const members = guild.memberCount || 'unknown';
  logger.debug(`Joined ${guildToString(guild)} with ${members} members.`);
});
