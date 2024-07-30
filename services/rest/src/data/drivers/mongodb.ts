import { MongoClient } from 'mongodb';

import { env } from '@/utils/config';

import { Logger } from '../../services/logger';

const { MONGO_URI } = env;

// Create the client and connect
const client = new MongoClient(MONGO_URI);
await client.connect().then(() => {
  Logger.info('Connected to MongoDB');
});

export const MongoDB = {
  client,
};
