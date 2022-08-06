import { Constants } from 'discord.js-light';
import { Event } from '#structures/Event';
import logger from '#util/logger';

export default new Event(Constants.Events.SHARD_RECONNECTING, async (id) => {
  logger.debug(`[Shard #${id}] Reconnecting...`);
});
