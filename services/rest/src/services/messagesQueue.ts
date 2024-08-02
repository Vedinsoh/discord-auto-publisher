import { DiscordSnowflake } from '@sapphire/snowflake';
import { Snowflake } from 'discord-api-types/v10';
import PQueue from 'p-queue';

import { Services } from '@/services';
import { minToMs, msToSec, secToMs } from '@/utils/timeConversions';

import { ChannelQueue } from './channelQueue';

// TODO refactor this class
export class MessagesQueue {
  private _channelQueues = new Map<Snowflake, ChannelQueue>();
  private _queue = new PQueue({
    concurrency: 5,
    intervalCap: 10,
    interval: secToMs(1),
    timeout: minToMs(5),
    autoStart: true,
  });
  private _timeout: NodeJS.Timeout | null = null;

  constructor() {
    // Check rate limits every 5 seconds
    setInterval(() => {
      this._rateLimitsCheck();
    }, secToMs(5));

    // Sweep inactive channel queues every 5 minutes
    setInterval(() => {
      this._sweepInactiveChannels();
    }, minToMs(5));
  }

  public async add(channelId: Snowflake, messageId: Snowflake, retries = 0) {
    // Check if the channel is over the crossposts limit

    const isOverLimit = await Services.CrosspostsCounter.isOverLimit(channelId);
    if (isOverLimit) return;

    // Check if the message has reached the max retries
    if (retries >= 10) {
      Services.Logger.debug(`Message ${messageId} has reached the max retries`);
      return;
    }

    return this._addToChannelQueue(channelId, messageId, retries);
  }

  private _addToChannelQueue(channelId: Snowflake, messageId: Snowflake, retries = 0) {
    const channel = this._getChannelQueue(channelId);
    if (!channel) return;
    channel.enqueue(async () => {
      await this._addToMainQueue(channelId, messageId, retries);
    });
  }

  private async _addToMainQueue(channelId: Snowflake, messageId: Snowflake, retries = 0) {
    // Check if the channel is over the crossposts limit
    const isOverLimit = await Services.CrosspostsCounter.isOverLimit(channelId);
    if (isOverLimit) return;

    return this._queue.add(async () => Services.Crosspost.submit(channelId, messageId, retries), {
      priority: this._getMessagePriority(messageId),
    });
  }

  private _getMessagePriority(messageId: Snowflake) {
    const messageTimestamp = DiscordSnowflake.timestampFrom(messageId) || Date.now();
    const priority = 9999999999999 - messageTimestamp;
    return priority;
  }

  private _newChannelQueue = (channelId: Snowflake) => {
    if (this._channelQueues.has(channelId)) return;
    this._channelQueues.set(channelId, new ChannelQueue());
    Services.Logger.debug(`Created queue for channel ${channelId}`);
  };

  private _getChannelQueue = (channelId: Snowflake) => {
    const channelData = this._channelQueues.get(channelId);
    if (!channelData) this._newChannelQueue(channelId);
    return this._channelQueues.get(channelId);
  };

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

  public getQueueData() {
    return {
      size: this._queue.size,
      pending: this._queue.pending,
      channelQueues: this._channelQueues.size,
      paused: this._queue.isPaused,
    };
  }

  private async _rateLimitsCheck() {
    const rateLimitSize = await Services.RateLimitsCache.getSize();
    if (this._queue.isPaused) {
      if (rateLimitSize > 8000) return;
      if (this._queue.pending === 0) this.resume();
      return;
    }
    if (rateLimitSize > 8000) {
      this.pause();
      return;
    }
  }

  public pause(duration = minToMs(1)) {
    this._queue.pause();
    this._timeout = setTimeout(() => {
      this.resume();
    }, duration);
    Services.Logger.debug(`Messages queue paused for ${msToSec(duration)}s`);
  }

  public resume() {
    this._queue.start();
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
    Services.Logger.debug('Messages queue resumed');
  }
}

// TODO change this to export instance instead
global.messagesQueue = new MessagesQueue();
