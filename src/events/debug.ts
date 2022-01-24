import { Event } from '#structures/Event';
import logger from '#util/logger';

export default new Event('debug', async (info: string) => {
  if (!info.match(/heartbeat/gi)) logger.debug(info);
});
