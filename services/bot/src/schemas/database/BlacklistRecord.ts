import { Schema } from 'mongoose';

export enum BlacklistRecordType {
  Unblacklist = 'unblacklist',
  Blacklist = 'blacklist',
}

export interface IBlacklistRecord {
  type: BlacklistRecordType;
  reason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export const BlacklistRecordSchema = new Schema(
  {
    type: {
      type: String,
      enum: Object.values(BlacklistRecordType),
      default: BlacklistRecordType.Blacklist,
      required: true,
    },
    reason: { type: String, default: null },
  },
  {
    _id: false,
    versionKey: false,
    timestamps: true,
  }
);
