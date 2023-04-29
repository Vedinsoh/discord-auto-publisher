import mongoose from 'mongoose';
import config from '#config';

export abstract class MongoClient {
  public client: typeof mongoose;

  constructor() {
    this.client = mongoose;
  }

  public async connect() {
    await this.client.connect(config.mongoUri);
  }
}
