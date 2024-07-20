import { Snowflake } from 'discord-api-types/v10';
import PQueue from 'p-queue';

import { Services } from '@/services';
// import client from '#client';
// import config from '#config';
// import crosspost from '#crosspost/crosspost';
import QueueChannel from '@/structures/QueueChannel';
// import type { ReceivedMessage } from '#types/MessageTypes';
import { minToMs, msToSec, secToMs } from '@/utils/timeConversions';

export class MessagesQueue {
  private _channels = new Map<Snowflake, QueueChannel>();
  private _mainQueue = new PQueue({
    concurrency: 5,
    intervalCap: 10,
    interval: secToMs(10),
    timeout: minToMs(5),
    autoStart: true,
  });
  private _queueTimeout: NodeJS.Timeout | null = null;
  private _intervalCounter = 0;

  constructor() {
    // setInterval(() => {
    //   this._throttleCheck();
    // }, secToMs(2));
    setInterval(() => {
      this._sweepInactiveChannels();
    }, minToMs(15));
  }

  public async add(channelId: Snowflake, messageId: Snowflake) {
    // if (await client.antiSpam.isFlagged(message.channelId)) {
    //   client.antiSpam.increment(message.channelId);
    //   return;
    // }
    return this._addToChannelQueue(channelId, messageId);
  }

  private _addToChannelQueue(channelId: Snowflake, messageId: Snowflake) {
    const channel = this._getChannel(channelId);
    if (!channel) return;
    channel.enqueue(async () => {
      await this._addToMainQueue(channelId, messageId);
    });
  }

  private async _addToMainQueue(channelId: Snowflake, messageId: Snowflake) {
    // if (await client.antiSpam.isFlagged(message.channelId)) {
    //   return client.antiSpam.increment(message.channelId);
    // }
    return this._mainQueue.add(() => Services.Crosspost.push(channelId, messageId), {
      // priority: this._getMessagePriority(message),
    });
  }

  // private _getMessagePriority(message: ReceivedMessage) {
  //   const messageTimestamp = message.createdTimestamp || Date.now();
  //   const priority = 9999999999999 - messageTimestamp;
  //   return priority;
  // }

  private _newChannel = (channelId: Snowflake) => {
    if (this._channels.has(channelId)) return;
    this._channels.set(channelId, new QueueChannel());
    Services.Logger.debug(`Added queue for channel ${channelId}`);
  };

  private _getChannel = (channelId: Snowflake) => {
    const channelData = this._channels.get(channelId);
    if (!channelData) this._newChannel(channelId);
    return this._channels.get(channelId);
  };

  public deleteChannels(guildId: Snowflake, channelIds: Snowflake[]) {
    channelIds.forEach((channelId) => this._channels.delete(channelId));
    Services.Logger.debug(`Deleted channel queues for guild ${guildId}`);
  }

  private _sweepInactiveChannels() {
    Services.Logger.debug('Sweeping inactive channel queues...');
    let count = 0;
    this._channels.forEach((channel, channelId) => {
      if (channel.isInactive) {
        this._channels.delete(channelId);
        count++;
      }
    });
    Services.Logger.debug(`Sweeped ${count} inactive channel queues`);
  }

  public getQueueData() {
    return {
      size: this._mainQueue.size,
      pending: this._mainQueue.pending,
      channelQueues: this._channels.size,
      paused: this._mainQueue.isPaused,
    };
  }

  // TODO
  // private async _throttleCheck() {
  //   const rateLimitSize = await client.cache.requestLimits.getSize();
  //   if (this._mainQueue.isPaused) {
  //     if (rateLimitSize > 400) return;
  //     if (this._mainQueue.pending === 0) this._resumeQueue();
  //     return;
  //   }
  //   if (this._mainQueue.pending < 10) return;
  //   if (rateLimitSize > 200) {
  //     this._pauseQueue(minToMs(5));
  //     return;
  //   }
  // }

  // private _pauseQueue(duration = minToMs(5)) {
  //   this._mainQueue.pause();
  //   this._queueTimeout = setTimeout(() => {
  //     this._resumeQueue();
  //   }, duration);
  //   Services.Logger.debug(`Crosspost queue paused for ${msToSec(duration)}s`);
  // }

  // private _resumeQueue() {
  //   this._mainQueue.start();
  //   if (this._queueTimeout) {
  //     clearTimeout(this._queueTimeout);
  //     this._queueTimeout = null;
  //   }
  //   Services.Logger.debug('Crosspost queue resumed');
  // }
}

global.messagesQueue = new MessagesQueue();
