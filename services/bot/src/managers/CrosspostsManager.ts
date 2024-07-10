import type { Snowflake } from 'discord.js';
import { Databases, Keys, RedisClient } from '#structures/RedisClient';
import type { ReceivedMessage } from '#types/MessageTypes';
import { minToSec } from '#util/timeConverters';

class CrosspostsManager extends RedisClient {
  constructor() {
    super(Databases.Crossposts);
  }

  private _createKey(channelId: Snowflake, messageId: Snowflake) {
    return this.joinKeys([Keys.Crosspost, channelId, messageId]);
  }

  public async add(message: ReceivedMessage) {
    const KEY = this._createKey(message.channelId, message.id);
    return this.client.setEx(KEY, minToSec(60), '1');
  }

  public async getCount(channelId: Snowflake) {
    return (await this.client.keys(this.joinKeys([Keys.Crosspost, channelId, '*']))).length;
  }

  public async getSize() {
    return this.client.dbSize();
  }
}

export default CrosspostsManager;
