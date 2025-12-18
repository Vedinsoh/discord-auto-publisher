import { createChannelsCache, Keys } from '@ap/redis';
import { Drivers } from 'data/drivers/index.js';

export const Channels = createChannelsCache(Drivers.Redis.Channels, Keys.Channel);
