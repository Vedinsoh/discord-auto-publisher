import { DiscordSnowflake } from '@sapphire/snowflake';
import { Snowflake } from 'discord-api-types/v10';
import PQueue from 'p-queue';

import { Services } from '@/services';
import { minToMs, msToSec, secToMs } from '@/utils/timeConversions';

import { ChannelQueue } from './channelQueue';

/**
 * Messages queue
 */
class Queue {
  private _queue = new PQueue({
    intervalCap: 35, // TODO
    concurrency: 20,
    interval: secToMs(1),
    timeout: minToMs(5),
    autoStart: true,
  });
  private _channelQueues = new Map<Snowflake, ChannelQueue>();
  private _timeout: NodeJS.Timeout | null = null;
  private _lastPause = 0;

  constructor() {
    // Check rate limits every 5 seconds
    setInterval(() => {
      this._rateLimitsCheck();
    }, secToMs(2));

    // Sweep inactive channel queues every 5 minutes
    setInterval(() => {
      this._sweepInactiveChannels();
    }, minToMs(5));
  }

  /**
   * Add message to the queue
   * @param channelId ID of the channel
   * @param messageId ID of the message
   * @param retries Number of retries
   */
  public async add(channelId: Snowflake, messageId: Snowflake, retries = 0) {
    // Check if the channel is over the crossposts limit

    const isOverLimit = await Services.Crosspost.Counter.isOverLimit(channelId);
    if (isOverLimit) return;

    // Check if the message has reached the max retries
    if (retries >= 10) {
      Services.Logger.debug(`Message ${messageId} has reached the max retries`);
      return;
    }

    return this._addToChannelQueue(channelId, messageId, retries);
  }

  /**
   * Add message to the channel queue
   */
  private _addToChannelQueue(channelId: Snowflake, messageId: Snowflake, retries = 0) {
    const channel = this._getChannelQueue(channelId);
    if (!channel) return;
    channel.add(async () => {
      await this._addToMainQueue(channelId, messageId, retries);
    });
  }

  /**
   * Add message to the main queue
   */
  private async _addToMainQueue(channelId: Snowflake, messageId: Snowflake, retries = 0) {
    // Check if the channel is over the crossposts limit
    const isOverLimit = await Services.Crosspost.Counter.isOverLimit(channelId);
    if (isOverLimit) return;

    return this._queue.add(async () => Services.Crosspost.Handler.submit(channelId, messageId, retries), {
      priority: this._getMessagePriority(messageId),
    });
  }

  /**
   * Get message priority based on timestamp
   */
  private _getMessagePriority(messageId: Snowflake) {
    const messageTimestamp = DiscordSnowflake.timestampFrom(messageId) || Date.now();
    const priority = 9999999999999 - messageTimestamp;
    return priority;
  }

  /**
   * Create new channel queue
   */
  private _newChannelQueue = (channelId: Snowflake) => {
    if (this._channelQueues.has(channelId)) return;
    this._channelQueues.set(channelId, new ChannelQueue());
    Services.Logger.debug(`Created queue for channel ${channelId}`);
  };

  /**
   * Get channel queue
   */
  private _getChannelQueue = (channelId: Snowflake) => {
    const channelData = this._channelQueues.get(channelId);
    if (!channelData) this._newChannelQueue(channelId);
    return this._channelQueues.get(channelId);
  };

  /**
   * Sweep inactive channel queues
   */
  private _sweepInactiveChannels() {
    Services.Logger.debug('Sweeping inactive channel queues...');
    let count = 0;
    this._channelQueues.forEach((channel, channelId) => {
      if (channel.isInactive) {
        this._channelQueues.delete(channelId);
        count++;
      }
    });
    Services.Logger.debug(`Sweeped ${count} inactive channel queues`);
  }

  /**
   * Get queue information
   * @returns Queue information
   */
  public getInfo() {
    return {
      size: this._queue.size,
      pending: this._queue.pending,
      channelQueues: this._channelQueues.size,
      paused: this._queue.isPaused,
    };
  }

  /**
   * Check rate limits and pause/resume the queue
   */
  private async _rateLimitsCheck() {
    const rateLimitSize = await Services.RateLimitsCache.getSize();
    if (this._queue.isPaused) {
      if (rateLimitSize > 8000) return;
      if (this._queue.pending === 0) this.resume();
      return;
    }
    if (rateLimitSize >= 1000) {
      // Check if the queue was paused recently
      if (Date.now() - this._lastPause < minToMs(1)) return;
      this.pause();
      return;
    }
  }

  /**
   * Pause the queue
   * @param duration Pause duration in milliseconds
   */
  public pause(duration = secToMs(10)) {
    this._queue.pause();
    this._lastPause = Date.now();
    this._timeout = setTimeout(() => {
      this.resume();
    }, duration);
    Services.Logger.debug(`Messages queue paused for ${msToSec(duration)}s`);
  }

  /**
   * Resume the queue
   */
  public resume() {
    this._queue.start();
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
    Services.Logger.debug('Messages queue resumed');
  }
}

export const MessagesQueue = new Queue();
