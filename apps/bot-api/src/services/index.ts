import { Channels } from './channels/index.js';
import { Crosspost } from './crosspost/index.js';
import { Info } from './info.js';
import { Logger } from './logger.js';
import { RateLimitsCache } from './rateLimitsCache.js';

export const Services = {
  Crosspost,
  Channels,
  Info,
  Logger,
  RateLimitsCache,
};
