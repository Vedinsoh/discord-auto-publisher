import { env } from 'lib/config/env.js';
import { MongoClient } from 'mongodb';

import { Logger } from '../../services/logger.js';

const { MONGO_URI } = env;

// Create the client and connect
const client = new MongoClient(MONGO_URI);
await client.connect().then(() => {
  Logger.info('Connected to MongoDB');
});

export const MongoDB = {
  client,
};
