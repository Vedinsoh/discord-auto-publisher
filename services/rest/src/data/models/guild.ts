export type Guild = {
  guildId: string;
  isBlacklisted: boolean;
  blacklistRecords: BlacklistRecord[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type BlacklistRecord = {
  type: BlacklistRecordType;
  reason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

// TODO migrate in DB (previously blacklist and unblacklist)
export enum BlacklistRecordType {
  Add = 'add',
  Remove = 'remove',
}
