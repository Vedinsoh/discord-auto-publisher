import type { NewsChannel, Snowflake } from 'discord.js';
import PQueue from 'p-queue';
import client from '#client';
import config from '#config';
import crosspost from '#crosspost/crosspost';
import type { ReceivedMessage } from '#types/MessageTypes';
import { minToMs, secToMs } from '#util/timeConverters';

type MessageOptions = {
  retry?: number;
  hasUrl?: boolean;
};

class QueueManager {
  private _mainQueue = new PQueue({
    concurrency: 5,
    intervalCap: 5,
    interval: secToMs(12),
    timeout: minToMs(15),
    carryoverConcurrencyCount: true,
    autoStart: true,
  });
  private _channelsQueue = new Map<Snowflake, PQueue>();

  public async add(message: ReceivedMessage, options?: MessageOptions) {
    const isRetry = options?.retry;
    const channel = message.channel as NewsChannel;

    if (await client.antiSpam.isFlagged(message.channelId)) {
      if (isRetry) return;
      return client.antiSpam.add(channel);
    }

    if (isRetry) {
      setTimeout(() => {
        this._addToChannelQueue(message, options.retry);
      }, secToMs(5));
      return;
    }

    if (options?.hasUrl && !isRetry) {
      setTimeout(() => {
        this._addToChannelQueue(message);
      }, secToMs(config.urlDetection.deferTimeout));
      return;
    }

    return this._addToChannelQueue(message, options?.retry);
  }

  private _addToChannelQueue(message: ReceivedMessage, retry = 0) {
    const queue = this._getChannelQueue(message.channelId);

    if (!queue) return;
    queue.add(() => this._addToMainQueue(message, retry));
  }

  private async _addToMainQueue(message: ReceivedMessage, retry = 0) {
    const channel = (await message.channel?.fetch()) as NewsChannel;

    if (await client.antiSpam.isFlagged(message.channelId)) {
      if (retry > 0) return;
      return client.antiSpam.add(channel);
    }

    return this._mainQueue.add(() => crosspost(message, retry ?? 0), {
      priority: this._getMessagePriority(message),
    });
  }

  private _getMessagePriority(message: ReceivedMessage) {
    const messageTimestamp = message.createdTimestamp ?? Date.now();
    const priority = Date.now() - messageTimestamp;
    return priority >= 0 ? priority : 0;
  }

  private _newChannelQueue = (channelId: Snowflake) => {
    if (this._channelsQueue.has(channelId)) return;
    this._channelsQueue.set(
      channelId,
      new PQueue({
        concurrency: 1,
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
    const queue = this._channelsQueue.get(channelId);

    if (!queue) this._newChannelQueue(channelId);
    return this._channelsQueue.get(channelId);
  };

  public clearChannelQueue(channelId: Snowflake) {
    const queue = this._channelsQueue.get(channelId);
    if (!queue) return;

    queue.clear();
    client.logger.debug(`Cleared queue for channel ${channelId}`);
  }

  public deleteChannelsQueue(guildId: Snowflake, channelIds: Snowflake[]) {
    channelIds.forEach((channelId) => {
      this._channelsQueue.delete(channelId);
    });
    client.logger.debug(`Deleted channel queues for guild ${guildId}`);
  }
}

export default QueueManager;
