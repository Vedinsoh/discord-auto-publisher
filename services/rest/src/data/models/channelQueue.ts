import PQueue from 'p-queue';

import { minToMs, secToMs } from '@/utils/timeConversions';

// TODO
export class ChannelQueue {
  private _queue = new PQueue({
    concurrency: 1,
    intervalCap: 1,
    interval: secToMs(5),
    timeout: minToMs(60),
    carryoverConcurrencyCount: true,
    autoStart: true,
  });
  private _lastActivity = Date.now();

  public get isInactive() {
    return Date.now() - this._lastActivity > minToMs(60);
  }

  public enqueue(fn: () => Promise<void>) {
    this._lastActivity = Date.now();
    return this._queue.add(fn);
  }
}
