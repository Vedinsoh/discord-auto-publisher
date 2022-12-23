import { Events } from 'discord.js';
import Event from '#structures/Event';
import logger from '#util/logger';

export default new Event(Events.Warn, async (info) => {
  logger.warn(info);
});
