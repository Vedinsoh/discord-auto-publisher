import client from '#client';
import config from '#config';
import { Client, type IClient } from '#schemas/database/Client';
import { MongoDBClient } from '#structures/MongoDBClient';
import { minToMs } from '#util/timeConverters';

class ClientDataManager extends MongoDBClient {
  private async _get() {
    return Client.findOne({ appId: client.user?.id });
  }

  public startGuildsCountInterval() {
    setInterval(() => this.updateGuildsCount(), minToMs(config.presenceInterval));
  }

  public async updateGuildsCount() {
    const data = await this._get();
    const guilds = (await client.cluster.fetchClientValues('guilds.cache.size')) //
      .reduce((p: number, n: number) => p + n);

    client.logger.debug(`Updating guilds count in DB. Guilds: ${guilds}`);

    if (guilds === 0) return;

    if (data) {
      data.guildsCount = guilds;
      await data.save();
    } else {
      if (!client.user?.id) return;
      const newClient = new Client({
        appId: client.user?.id,
        guildsCount: guilds,
      });
      await newClient.save();
    }
  }

  public async getGuildsCount() {
    const clients: IClient[] = await Client.find({ guildsCount: { $exists: true } });
    const guildsCountSum = clients.reduce((sum: number, client: IClient) => {
      return sum + (client.get('guildsCount') as number);
    }, 0);
    return guildsCountSum;
  }
}

export default ClientDataManager;
