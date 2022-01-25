import { Event } from '#structures/Event';
import logger from '#util/logger';

export default new Event('warn', async (info: string) => {
  logger.warn(info);
});
