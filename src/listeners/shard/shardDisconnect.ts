import { CloseEvent } from 'discord.js-light';
import { Event } from '#structures/Event';
import logger from '#util/logger';

export default new Event('shardDisconnect', async (event: CloseEvent, id: number) => {
  logger.warn(`[Shard #${id}] Code ${event.code}, ${event.reason}`);
});
