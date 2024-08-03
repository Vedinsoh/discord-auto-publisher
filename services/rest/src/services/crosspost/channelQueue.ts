import PQueue from 'p-queue';

import { minToMs, secToMs } from '@/utils/timeConversions';

/**
 * Queue for the channel
 */
export class ChannelQueue {
  private _queue = new PQueue({
    concurrency: 1,
    intervalCap: 1,
    interval: secToMs(10),
    timeout: minToMs(60),
    carryoverConcurrencyCount: true,
    autoStart: true,
  });
  private _lastActivity = Date.now();

  /**
   * Check if the channel is inactive
   */
  public get isInactive() {
    return Date.now() - this._lastActivity > minToMs(60);
  }

  /**
   * Add a function to the channel queue
   * @param fn Function to add
   */
  public add(fn: () => Promise<void>) {
    this._lastActivity = Date.now();
    return this._queue.add(fn);
  }
}
