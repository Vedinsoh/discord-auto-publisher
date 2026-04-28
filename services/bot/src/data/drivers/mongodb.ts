import { MongoClient } from 'mongodb';
import { logger } from '#utils/logger';
import { env } from '#utils/config';

const client = new MongoClient(env.MONGO_URI);
await client.connect();
logger.info('Connected to MongoDB');

export const MongoDB = { client };
