import { Snowflake } from 'discord-api-types/v10';
import PQueue from 'p-queue';

import { Services } from '@/services';

/**
 * Messages queue — flow control for crosspost requests.
 * Rate limit handling is delegated to discord.js (auto-retry) and the proxy (centralized tracking).
 * Per-channel sublimits are handled via Redis counter + shared scope detection.
 */
class Queue {
  private _queue = new PQueue({
    concurrency: 45,
  });

  /**
   * Add message to the queue
   * @param channelId ID of the channel
   * @param messageId ID of the message
   */
  public async add(channelId: Snowflake, messageId: Snowflake) {
    const isOverLimit = await Services.Crosspost.Counter.isOverLimit(channelId);
    if (isOverLimit) return;

    return this._queue.add(async () => Services.Crosspost.Handler.submit(channelId, messageId));
  }

  /**
   * Get queue information
   */
  public getInfo() {
    return {
      size: this._queue.size,
      pending: this._queue.pending,
    };
  }
}

export const MessagesQueue = new Queue();
