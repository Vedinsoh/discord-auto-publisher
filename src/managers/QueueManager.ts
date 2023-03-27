import PQueue from 'p-queue';
import config from '#config';
import crosspost from '#crosspost/crosspost';
import type { ReceivedMessage } from '#types/MessageTypes';
import { minToMs, secToMs } from '#util/timeConverters';

type MessageOptions = {
  retry?: number;
  hasUrl?: boolean;
};

class QueueManager {
  private _shardQueue = new PQueue({
    concurrency: 5,
    intervalCap: 10,
    interval: secToMs(5),
    timeout: minToMs(10),
    carryoverConcurrencyCount: true,
    autoStart: true,
  });

  public add(message: ReceivedMessage, options?: MessageOptions) {
    const isRetry = options?.retry;

    if (isRetry) {
      setTimeout(() => {
        this._enqueue(message, options.retry);
      }, secToMs(5));
      return;
    }

    if (options?.hasUrl && !isRetry) {
      setTimeout(() => {
        this._enqueue(message, options.retry);
      }, secToMs(config.urlDetection.deferTimeout));
      return;
    }

    return this._enqueue(message, options?.retry);
  }

  private _enqueue(message: ReceivedMessage, retry = 0) {
    const messageTimestamp = message.createdTimestamp ?? Date.now();
    const priority = Date.now() - messageTimestamp;

    this._shardQueue.add(() => crosspost(message, retry ?? 0), {
      priority: priority < 0 ? 0 : priority,
    });
  }
}

export default QueueManager;
