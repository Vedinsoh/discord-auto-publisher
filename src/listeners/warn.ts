import DJS from 'discord.js';
import Event from '#structures/Event';
import logger from '#util/logger';

const { Constants } = DJS;

export default new Event(Constants.Events.WARN, async (info) => {
  logger.warn(info);
});
