import DJS from 'discord.js';
import Event from '#structures/Event';
import logger from '#util/logger';

const { Constants } = DJS;

export default new Event(Constants.Events.SHARD_DISCONNECT, async (event, id) => {
  logger.warn(`[Shard #${id}] Code ${event.code}, ${event.reason}`);
});
