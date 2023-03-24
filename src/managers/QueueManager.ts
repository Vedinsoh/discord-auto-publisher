import type { Snowflake } from 'discord.js';
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
  private _guildQueues = new Map<Snowflake, PQueue>();
  private _addQueue = (guildId: Snowflake) => {
    if (this._guildQueues.has(guildId)) return;
    this._guildQueues.set(
      guildId,
      new PQueue({
        concurrency: 5,
        intervalCap: 10,
        interval: secToMs(12),
        timeout: minToMs(10),
        carryoverConcurrencyCount: true,
        autoStart: true,
      })
    );
    client.logger.debug(`Added queue for guild ${guildId}`);
  };

  public add(message: ReceivedMessage, options?: MessageOptions) {
    if (options?.hasUrl) {
      setTimeout(() => {
        this._enqueue(message, options.retry);
      }, secToMs(config.urlDetection.deferTimeout));
      return;
    }
    return this._enqueue(message, options?.retry);
  }

  public deleteQueue(guildId: Snowflake) {
    this._guildQueues.delete(guildId);
    client.logger.debug(`Deleted queue for guild ${guildId}`);
  }

  private _getQueue = (guildId: Snowflake) => {
    const queue = this._guildQueues.get(guildId);

    if (!queue) this._addQueue(guildId);
    return this._guildQueues.get(guildId);
  };

  private _enqueue(message: ReceivedMessage, retry = 0) {
    const { guild } = message;
    if (!guild) return;

    const queue = this._getQueue(guild.id);
    if (!queue) throw new Error(`Queue for guild ${guild.id} not found`);

    queue.add(() => crosspost(message, retry), {
      priority: retry,
    });
  }
}

export default QueueManager;
