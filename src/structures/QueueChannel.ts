import PQueue from 'p-queue';
import { minToMs, secToMin } from '#util/timeConverters';

class QueueChannel {
  private _queue = new PQueue({
    concurrency: 1,
    intervalCap: 1,
    interval: secToMin(15),
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

export default QueueChannel;
