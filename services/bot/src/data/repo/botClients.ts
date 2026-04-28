import { logger } from '#utils/logger';
import { Drivers } from '../drivers/index.js';
import type { BotClient } from '../models/botClient.js';

const collection = Drivers.MongoDB.client.db().collection<BotClient>('botClients');

type MutatedData = Omit<BotClient, 'appId' | 'createdAt' | 'updatedAt'>;

const findOne = async (appId: BotClient['appId']) => {
  try {
    return await collection.findOne({ appId });
  } catch (error) {
    logger.warn(error, `botClients.findOne failed for ${appId}`);
    return null;
  }
};

const findMany = async () => {
  try {
    return await collection.find().toArray();
  } catch (error) {
    logger.warn(error, 'botClients.findMany failed');
    return [];
  }
};

const insert = async (appId: BotClient['appId'], data: Partial<MutatedData>) => {
  const now = new Date();
  return await collection.insertOne({ guildsCount: 0, ...data, appId, createdAt: now, updatedAt: now });
};

const update = async (appId: BotClient['appId'], data: Partial<MutatedData>) => {
  try {
    const existing = await collection.findOne({ appId });
    if (!existing) {
      return await insert(appId, data);
    }
    return await collection.updateOne({ appId }, { $set: { ...data, updatedAt: new Date() } });
  } catch (error) {
    logger.warn(error, `botClients.update failed for ${appId}`);
    return null;
  }
};

export const BotClients = {
  findOne,
  findMany,
  insert,
  update,
};
