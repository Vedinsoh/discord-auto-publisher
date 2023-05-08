import type { Snowflake } from 'discord.js';
import PQueue from 'p-queue';
import client from '#client';
import config from '#config';
import crosspost from '#crosspost/crosspost';
import type { ReceivedMessage } from '#types/MessageTypes';
import { minToMs, secToMs } from '#util/timeConverters';

type MessageOptions = {
  hasUrl?: boolean;
};

class QueueManager {
  private _mainQueue = new PQueue({
    intervalCap: 100,
    interval: secToMs(15),
    timeout: minToMs(120),
    autoStart: true,
  });
  private _channelsQueue = new Map<Snowflake, PQueue>();

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
    const channelQueue = this._getChannelQueue(message.channelId);

    if (!channelQueue) return;
    channelQueue.add(() => this._addToMainQueue(message));
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
    const messageTimestamp = message.createdTimestamp ?? Date.now();
    const priority = 9999999999999 - messageTimestamp;
    return priority >= 0 ? priority : 0;
  }

  private _newChannelQueue = (channelId: Snowflake) => {
    if (this._channelsQueue.has(channelId)) return;
    this._channelsQueue.set(
      channelId,
      new PQueue({
        concurrency: 2,
        intervalCap: 11,
        interval: minToMs(5),
        timeout: minToMs(60),
        carryoverConcurrencyCount: true,
        autoStart: true,
      })
    );
    client.logger.debug(`Added queue for channel ${channelId}`);
  };

  private _getChannelQueue = (channelId: Snowflake) => {
    const channelQueue = this._channelsQueue.get(channelId);

    if (!channelQueue) this._newChannelQueue(channelId);
    return this._channelsQueue.get(channelId);
  };

  public clearChannelQueue(channelId: Snowflake) {
    const channelQueue = this._channelsQueue.get(channelId);
    if (!channelQueue) return;

    channelQueue.clear();
    client.logger.debug(`Cleared queue for channel ${channelId}`);
  }

  public deleteChannelsQueue(guildId: Snowflake, channelIds: Snowflake[]) {
    channelIds.forEach((channelId) => {
      this._channelsQueue.delete(channelId);
    });
    client.logger.debug(`Deleted channel queues for guild ${guildId}`);
  }

  public getQueueData() {
    return {
      size: this._mainQueue.size,
      pending: this._mainQueue.pending,
      channelQueues: this._channelsQueue.size,
    };
  }
}

export default QueueManager;
