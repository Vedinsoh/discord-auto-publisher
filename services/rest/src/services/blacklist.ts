import { Data } from '@/data';
import { BlacklistRecord } from '@/data/models/guild';

// Retrieves the blacklist status for a guild
const getStatus = async (guildId: string) => {
  const guild = await Data.Repo.Guild.find(guildId);
  return guild?.isBlacklisted || false;
};

// Retrieves blacklist records for a guild
const getRecords = async (guildId: string) => {
  const guild = await Data.Repo.Guild.find(guildId);
  return guild?.blacklistRecords || [];
};

const addRecord = async (guildId: string, record: BlacklistRecord) => {
  const guild = await Data.Repo.Guild.find(guildId);

  if (guild) {
    guild.blacklistRecords.push(record);
  }

  await Data.Repo.Guild.update(guildId, { blacklistRecords: guild?.blacklistRecords || [record] });
};

export const Blacklist = {
  getStatus,
  getRecords,
  addRecord,
};
