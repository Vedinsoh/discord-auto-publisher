import { DiscordSnowflake } from '@sapphire/snowflake';
import { Snowflake } from 'discord-api-types/v10';
import PQueue from 'p-queue';

import { Services } from '@/services';
import { minToMs, msToSec, secToMs } from '@/utils/timeConversions';

import { ChannelQueue } from './channelQueue';

export class MessagesQueue {
  private _channelQueues = new Map<Snowflake, ChannelQueue>();
  private _mainQueue = new PQueue({
    concurrency: 5,
    intervalCap: 10,
    interval: secToMs(1),
    timeout: minToMs(5),
    autoStart: true,
  });
  private _queueTimeout: NodeJS.Timeout | null = null;

  constructor() {
    setInterval(() => {
      this._throttleCheck();
    }, secToMs(2));
    setInterval(() => {
      this._sweepInactiveChannels();
    }, minToMs(15));
  }

  public async add(channelId: Snowflake, messageId: Snowflake) {
    const isOverLimit = await Services.CrosspostsCounter.isOverLimit(channelId);
    if (isOverLimit) {
      Services.Logger.debug(`Channel ${channelId} is over the crossposts limit`);
      return;
    }

    return this._addToChannelQueue(channelId, messageId);
  }

  private _addToChannelQueue(channelId: Snowflake, messageId: Snowflake) {
    const channel = this._getChannelQueue(channelId);
    if (!channel) return;
    channel.enqueue(async () => {
      await this._addToMainQueue(channelId, messageId);
    });
  }

  private async _addToMainQueue(channelId: Snowflake, messageId: Snowflake) {
    const isOverLimit = await Services.CrosspostsCounter.isOverLimit(channelId);
    if (isOverLimit) {
      Services.Logger.debug(`Channel ${channelId} is over the crossposts limit`);
      return;
    }

    return this._mainQueue.add(async () => Services.Crosspost.submit(channelId, messageId), {
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
      size: this._mainQueue.size,
      pending: this._mainQueue.pending,
      channelQueues: this._channelQueues.size,
      paused: this._mainQueue.isPaused,
    };
  }

  private async _throttleCheck() {
    const rateLimitSize = await Services.RateLimitsCache.getSize();
    if (this._mainQueue.isPaused) {
      if (rateLimitSize > 8000) return;
      if (this._mainQueue.pending === 0) this._resumeQueue();
      return;
    }
    if (this._mainQueue.pending < 10) return;
    if (rateLimitSize > 8000) {
      this._pauseQueue();
      return;
    }
  }

  private _pauseQueue(duration = minToMs(1)) {
    this._mainQueue.pause();
    this._queueTimeout = setTimeout(() => {
      this._resumeQueue();
    }, duration);
    Services.Logger.debug(`Messages queue paused for ${msToSec(duration)}s`);
  }

  private _resumeQueue() {
    this._mainQueue.start();
    if (this._queueTimeout) {
      clearTimeout(this._queueTimeout);
      this._queueTimeout = null;
    }
    Services.Logger.debug('Messages queue resumed');
  }
}

global.messagesQueue = new MessagesQueue();
