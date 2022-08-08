import { Message, Snowflake } from 'discord.js-light';
import client from '#client';
import { Command } from '#structures/Command';
import logger from '#util/logger';

export default new Command('unblacklist', async ({ channel }: Message, guildId?: Snowflake) => {
  if (!guildId) return channel.send('Please provide server ID.');
  await client.blacklist.remove(guildId).then((response) => {
    channel.send(response);
    logger.info(response);
  });
});
