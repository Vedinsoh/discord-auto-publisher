import { Message, Snowflake } from 'discord.js-light';
import { Command } from '#structures/Command';
import Blacklist from '#modules/BlacklistManager';
import logger from '#util/logger';

export default new Command('blacklist', async ({ channel }: Message, guildId?: Snowflake) => {
  if (!guildId) return channel.send('Please provide server ID.');
  await Blacklist.add(guildId).then((response) => {
    channel.send(response);
    logger.info(response);
  });
});
