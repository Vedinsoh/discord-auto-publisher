import { Constants } from 'discord.js-light';
import Event from '#structures/Event';
import logger from '#util/logger';

export default new Event(Constants.Events.ERROR, async (error) => {
  logger.error(error);
});
