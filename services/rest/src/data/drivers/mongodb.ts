import { MongoClient } from 'mongodb';

import { Services } from '@/services';
import { env } from '@/utils/config';

const { MONGO_URI } = env;

// Create the client and connect
const client = new MongoClient(MONGO_URI);
await client.connect().then(() => {
  Services.Logger.info('Connected to MongoDB');
});

export const MongoDB = {
  client,
};
