import DJS from 'discord.js';
import Event from '#structures/Event';
import logger from '#util/logger';

const { Constants } = DJS;

export default new Event(Constants.Events.ERROR, async (error) => {
  logger.error(error);
});
