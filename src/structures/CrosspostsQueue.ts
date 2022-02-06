import PQueue from 'p-queue';
import { secToMs } from '#util/timeConverters';

const discordRateLimit = 50;

export class CrosspostsQueue extends PQueue {
  constructor() {
    super({
      concurrency: discordRateLimit,
      intervalCap: discordRateLimit,
      interval: secToMs(1),
      carryoverConcurrencyCount: true,
    });
  }
}
