import { Drivers } from '../drivers';
import { BotClient as BotClientModel } from '../models/botClient';

// Get the MongoDB client and database
const db = Drivers.MongoDB.client.db('auto_publisher');
const collection = db.collection<BotClientModel>('botClients');

type MutatedData = Omit<BotClientModel, 'appId' | 'createdAt' | 'updatedAt'>;

/**
 * Find all bot clients
 * @returns All bot clients
 */
const findMany = async () => {
  return await collection.find().toArray();
};

/**
 * Insert a new bot client into the database
 * @param appId ID of the bot client
 * @param data Bot client data
 * @returns Inserted bot client
 */
const insert = async (appId: BotClientModel['appId'], data: Partial<MutatedData>) => {
  const now = new Date();
  return await collection.insertOne({ ...data, appId, createdAt: now, updatedAt: now, guildsCount: 0 });
};

/**
 * Update a bot client in the database
 * @param id ID of the bot client
 * @param data Bot client data
 * @returns Updated bot client
 */
const update = async (id: BotClientModel['appId'], data: Partial<MutatedData>) => {
  // Get the current guild data
  const guild = await collection.findOne({ guildId: id });

  // Insert the guild if it doesn't exist
  if (!guild) {
    return await insert(id, { ...data });
  }

  // Update the guild data
  return await collection.updateOne({ appId: id }, { $set: { ...data, updatedAt: new Date() } });
};

export const BotClients = {
  findMany,
  insert,
  update,
};
