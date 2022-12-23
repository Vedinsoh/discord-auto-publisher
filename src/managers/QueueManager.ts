import type { Snowflake } from 'discord.js';
import PQueue from 'p-queue';
import config from '#config';
import crosspost from '#crosspost/crosspost';
import type { ReceivedMessage } from '#types/MessageTypes';
import logger from '#util/logger';
import { minToMs, secToMs } from '#util/timeConverters';

const { urlDetection } = config;

class QueueManager {
  private _queues = new Map<Snowflake, PQueue>();

  private _addQueue = (guildId: Snowflake) => {
    if (this._queues.has(guildId)) return;
    this._queues.set(
      guildId,
      new PQueue({
        concurrency: 5,
        intervalCap: 5,
        interval: secToMs(10),
        timeout: minToMs(10),
        carryoverConcurrencyCount: true,
        autoStart: true,
      })
    );
    logger.debug(`Added queue for guild ${guildId}`);
  };

  private _getQueue = (guildId: Snowflake) => {
    const guild = this._queues.get(guildId);

    if (!guild) this._addQueue(guildId);
    return this._queues.get(guildId);
  };

  private _enqueue(message: ReceivedMessage) {
    const { guild } = message;
    if (!guild) return;

    const { id: guildId } = guild;
    const queue = this._getQueue(guildId);
    if (!queue) throw new Error(`Queue for guild ${guildId} not found`);

    queue.add(() => crosspost(message));
  }

  public add(message: ReceivedMessage, defer = false) {
    if (defer) {
      setTimeout(() => {
        this._enqueue(message);
      }, secToMs(urlDetection.deferTimeout));
      return;
    }
    return this._enqueue(message);
  }

  public deleteQueue(guildId: Snowflake) {
    this._queues.delete(guildId);
    logger.debug(`Deleted queue for guild ${guildId}`);
  }
}

export default QueueManager;
