import mongoose from 'mongoose';
import config from '#config';

export abstract class MongoDBClient {
  public client: typeof mongoose;

  constructor() {
    this.client = mongoose;
  }

  public async connect() {
    await this.client.connect(config.mongoUri, {
      appName: 'Auto Publisher',
      dbName: 'auto_publisher',
    });
  }
}
