import type { Snowflake } from 'discord.js';
import PQueue from 'p-queue';
import client from '#client';
import config from '#config';
import crosspost from '#crosspost/crosspost';
import QueueChannel from '#structures/QueueChannel';
import type { ReceivedMessage } from '#types/MessageTypes';
import { minToMs, msToSec, secToMs } from '#util/timeConverters';

type MessageOptions = {
  hasUrl?: boolean;
};

class QueueManager {
  private _channels = new Map<Snowflake, QueueChannel>();
  private _mainQueue = new PQueue({
    concurrency: 12,
    intervalCap: 40,
    interval: secToMs(10),
    timeout: minToMs(5),
    autoStart: true,
  });
  private _queueTimeout: NodeJS.Timeout | null = null;

  constructor() {
    setInterval(() => {
      this._throttleCheck();
    }, secToMs(5));
    setInterval(() => {
      this._sweepInactiveChannels();
    }, minToMs(15));
  }

  public async add(message: ReceivedMessage, options?: MessageOptions) {
    if (await client.antiSpam.isFlagged(message.channelId)) {
      client.antiSpam.increment(message.channelId);
      return;
    }
    if (options?.hasUrl) {
      setTimeout(() => {
        this._addToChannelQueue(message);
      }, secToMs(config.urlDetection.deferTimeout));
      return;
    }
    return this._addToChannelQueue(message);
  }

  private _addToChannelQueue(message: ReceivedMessage) {
    const channel = this._getChannel(message.channelId);
    if (!channel) return;
    channel.enqueue(() => this._addToMainQueue(message));
  }

  private async _addToMainQueue(message: ReceivedMessage) {
    if (await client.antiSpam.isFlagged(message.channelId)) {
      return client.antiSpam.increment(message.channelId);
    }
    return this._mainQueue.add(() => crosspost(message), {
      priority: this._getMessagePriority(message),
    });
  }

  private _getMessagePriority(message: ReceivedMessage) {
    const messageTimestamp = message.createdTimestamp || Date.now();
    const priority = 9999999999999 - messageTimestamp;
    return priority;
  }

  private _newChannel = (channelId: Snowflake) => {
    if (this._channels.has(channelId)) return;
    this._channels.set(channelId, new QueueChannel());
    client.logger.debug(`Added queue for channel ${channelId}`);
  };

  private _getChannel = (channelId: Snowflake) => {
    const channelData = this._channels.get(channelId);
    if (!channelData) this._newChannel(channelId);
    return this._channels.get(channelId);
  };

  public deleteChannels(guildId: Snowflake, channelIds: Snowflake[]) {
    channelIds.forEach((channelId) => this._channels.delete(channelId));
    client.logger.debug(`Deleted channel queues for guild ${guildId}`);
  }

  private _sweepInactiveChannels() {
    client.logger.debug('Sweeping inactive channel queues...');
    let count = 0;
    this._channels.forEach((channel, channelId) => {
      if (channel.isInactive) {
        this._channels.delete(channelId);
        count++;
      }
    });
    client.logger.debug(`Sweeped ${count} inactive channel queues`);
  }

  public getQueueData() {
    return {
      size: this._mainQueue.size,
      pending: this._mainQueue.pending,
      channelQueues: this._channels.size,
      paused: this._mainQueue.isPaused,
    };
  }

  private async _throttleCheck() {
    const rateLimitSize = await client.cache.requestLimits.getSize();
    if (this._mainQueue.isPaused) {
      if (rateLimitSize > 400) return;
      if (this._mainQueue.pending === 0) this._resumeQueue();
      return;
    }
    if (this._mainQueue.pending < this._mainQueue.concurrency) return;
    if (rateLimitSize > 200) {
      this._pauseQueue(minToMs(5));
      return;
    }
  }

  private _pauseQueue(duration = minToMs(5)) {
    this._mainQueue.pause();
    this._queueTimeout = setTimeout(() => {
      this._resumeQueue();
    }, duration);
    client.logger.debug(`Crosspost queue paused for ${msToSec(duration)}s`);
  }

  private _resumeQueue() {
    this._mainQueue.start();
    if (this._queueTimeout) {
      clearTimeout(this._queueTimeout);
      this._queueTimeout = null;
    }
    client.logger.debug('Crosspost queue resumed');
  }
}

export default QueueManager;
