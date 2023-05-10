import { Databases, Keys, RedisClient } from '#structures/RedisClient';
import { minToSec } from '#util/timeConverters';

class RequestLimitManager extends RedisClient {
  constructor() {
    super(Databases.RequestLimits);
  }

  private _createKey(identifier: string, code: number) {
    return this.joinKeys([Keys.InvalidRequest, identifier, String(code)]);
  }

  public async add(identifier: string, code: number) {
    const KEY = this._createKey(identifier, code);
    return this.client.setEx(KEY, minToSec(10), '1');
  }

  public async getSize() {
    return this.client.dbSize();
  }
}

export default RequestLimitManager;
