import { Events } from 'discord.js';
import Event from '#structures/Event';
import logger from '#util/logger';

export default new Event(Events.Error, async (error) => {
  logger.error(error);
});
