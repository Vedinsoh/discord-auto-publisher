import { Data } from '@/data';
import { Guild as GuildModel } from '@/data/models/guild';

type MutatedData = Omit<GuildModel, 'guildId' | 'createdAt' | 'updatedAt'>;

// Retrieves a single guild from the database
const find = async (id: string) => {
  const db = await Data.Drivers.MongoDB.connect();
  const guild = await db.collection<GuildModel>('guilds').findOne({ guildId: id });
  return guild;
};

// Inserts a single guild into the database
const insert = async (guildId: GuildModel['guildId'], data: Partial<MutatedData>) => {
  const db = await Data.Drivers.MongoDB.connect();
  const now = new Date();
  return await db
    .collection<GuildModel>('guilds')
    .insertOne({ isBlacklisted: false, blacklistRecords: [], ...data, guildId, createdAt: now, updatedAt: now });
};

// Updates a single guild in the database
const update = async (id: GuildModel['guildId'], data: Partial<MutatedData>) => {
  const db = await Data.Drivers.MongoDB.connect();

  // Get the current guild data
  const guild = await db.collection<GuildModel>('guilds').findOne({ guildId: id });

  // Insert the guild if it doesn't exist
  if (!guild) {
    return await insert(id, { ...data });
  }

  // Update the guild data
  return await db
    .collection<GuildModel>('guilds')
    .updateOne({ guildId: id }, { $set: { ...data, updatedAt: new Date() } });
};

export const Guild = {
  find,
  insert,
  update,
};
