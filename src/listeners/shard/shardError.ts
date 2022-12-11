import DJS from 'discord.js-light';
import Event from '#structures/Event';
import logger from '#util/logger';

const { Constants } = DJS;

export default new Event(Constants.Events.SHARD_ERROR, async (error, id) => {
  logger.error(`[Shard #${id}] ${error.stack}`);
});
