import { Document, Schema, model } from 'mongoose';
import { BlacklistRecordSchema, type IBlacklistRecord } from '#schemas/database/BlacklistRecord';

export interface IGuild extends Document {
  guildId: string;
  isBlacklisted: boolean;
  blacklistRecords: IBlacklistRecord[];
}

const GuildSchema = new Schema(
  {
    guildId: { type: String, required: true, unique: true },
    isBlacklisted: { type: Boolean, default: false },
    blacklistRecords: {
      type: [BlacklistRecordSchema],
      default: [],
    },
  },
  {
    versionKey: false,
    autoCreate: true,
    timestamps: true,
  }
);

export const Guild = model<IGuild>('Guild', GuildSchema);
