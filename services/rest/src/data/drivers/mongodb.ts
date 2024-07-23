import { MongoClient } from 'mongodb';

import { Services } from '@/services';
import { env } from '@/utils/config';

const { MONGO_URI } = env;

// Create the client
let client: MongoClient | null = null;

/**
 * Connect to the MongoDB database
 * @returns The database client
 */
export async function connect() {
  // Check if the client is already connected to avoid duplicate connections
  if (!client) {
    // Create the client and connect to the database
    client = new MongoClient(MONGO_URI);
    await client.connect();

    Services.Logger.info('Connected to MongoDB');
  }

  // Return the client
  return client.db('auto_publisher');
}

/**
 * Disconnect from the MongoDB database
 */
export async function disconnect() {
  // Check if the client is connected before disconnecting
  if (client) {
    // Disconnect from the database
    await client.close();
    client = null;

    Services.Logger.info('Disconnected from MongoDB');
  }
}

export const MongoDB = {
  connect,
  disconnect,
};
