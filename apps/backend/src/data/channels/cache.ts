import { createChannelsCache, Keys } from '@ap/redis';
import { Drivers } from 'data/drivers/index.js';

export const Cache = createChannelsCache(Drivers.Redis.client, Keys.Channel);
