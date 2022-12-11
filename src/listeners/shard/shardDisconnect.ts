import { Constants } from 'discord.js-light';
import Event from '#structures/Event';
import logger from '#util/logger';

export default new Event(Constants.Events.SHARD_DISCONNECT, async (event, id) => {
  logger.warn(`[Shard #${id}] Code ${event.code}, ${event.reason}`);
});
