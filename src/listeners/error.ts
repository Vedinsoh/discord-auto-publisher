import { Event } from '#structures/Event';
import logger from '#util/logger';

export default new Event('error', async (error: Error) => {
  logger.error(JSON.stringify(error, null, 4));
});
