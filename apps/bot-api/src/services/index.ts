import { Channels } from './channels/index.js';
import { Crosspost } from './crosspost/index.js';
import { Guilds } from './guilds/index.js';
import { Info } from './info.js';
import { Logger } from './logger.js';
import { RateLimitsCache } from './rateLimitsCache.js';

export const Services = {
  Crosspost,
  Channels,
  Guilds,
  Info,
  Logger,
  RateLimitsCache,
};
