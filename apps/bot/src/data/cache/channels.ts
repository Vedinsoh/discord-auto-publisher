import { createChannelsCache, Keys } from '@ap/redis';
import { Redis } from './redis.js';

export const Channels = createChannelsCache(Redis.Channels, Keys.Channel);
