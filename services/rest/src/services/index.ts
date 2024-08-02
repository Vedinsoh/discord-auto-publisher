import { Crosspost } from './crosspost';
import { MessagesQueue } from './crosspost/messagesQueue';
import { Info } from './info';
import { Logger } from './logger';
import { Presence } from './presence';
import { RateLimitsCache } from './rateLimitsCache';

export const Services = {
  Crosspost,
  Info,
  Logger,
  MessagesQueue,
  Presence,
  RateLimitsCache,
};
