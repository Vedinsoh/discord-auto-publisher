import mongoose from 'mongoose';
import { URL } from 'node:url';
import config from '#config';

export abstract class MongoDBClient {
  public client: typeof mongoose;

  constructor() {
    this.client = mongoose;
  }

  public async connect() {
    const uri = new URL(config.mongoUri);

    await this.client.connect(config.mongoUri, {
      appName: 'Auto Publisher',
      dbName: uri.pathname.substring(1) || 'auto_publisher',
    });
  }
}
