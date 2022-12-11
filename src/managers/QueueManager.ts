import type { Snowflake } from 'discord.js';
import PQueue from 'p-queue';
import config from '#config';
import crosspost from '#crosspost/crosspost';
import type { ReceivedMessage } from '#types/MessageTypes';
import { secToMs } from '#util/timeConverters';

const { urlDetection } = config;

class QueueManager {
  private _queues = new Map<Snowflake, PQueue>();

  private _addQueue = (guildId: Snowflake) => {
    if (this._queues.has(guildId)) return;

    this._queues.set(
      guildId,
      new PQueue({
        concurrency: 10,
        intervalCap: 10,
        interval: secToMs(15),
        timeout: secToMs(60),
        carryoverConcurrencyCount: true,
        autoStart: true,
      })
    );
  };

  private _getQueue = (guildId: Snowflake) => {
    const guild = this._queues.get(guildId);

    if (!guild) this._addQueue(guildId);
    return this._queues.get(guildId);
  };

  private async _enqueue(message: ReceivedMessage) {
    const { guild } = message;
    if (!guild) return;

    const { id: guildId } = guild;
    const queue = this._getQueue(guildId);
    if (!queue) throw new Error(`Queue for guild ${guildId} not found`);

    return queue.add(() => crosspost(message));
  }

  public async add(message: ReceivedMessage, defer = false) {
    if (defer)
      setTimeout(() => {
        this._enqueue(message);
      }, secToMs(urlDetection.deferTimeout));
    return this._enqueue(message);
  }
}

export default QueueManager;
