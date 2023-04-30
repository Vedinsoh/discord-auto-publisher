import { Document, Schema, model } from 'mongoose';

export enum BlacklistEventType {
  Unblacklist = 'unblacklist',
  Blacklist = 'blacklist',
}

interface IBlacklistEvent {
  type: BlacklistEventType;
  timestamp: Date;
  reason: string | null;
}

export interface IGuild extends Document {
  guildId: string;
  isBlacklisted: boolean;
  blacklistEvents: IBlacklistEvent[];
}

const GuildSchema = new Schema(
  {
    guildId: { type: String, required: true, unique: true },
    isBlacklisted: { type: Boolean, default: false },
    blacklistEvents: [
      {
        type: {
          type: String,
          enum: Object.values(BlacklistEventType),
          default: BlacklistEventType.Blacklist,
          required: true,
        },
        timestamp: { type: Date, default: Date.now },
        reason: { type: String, default: null },
      },
    ],
  },
  {
    versionKey: false,
    autoCreate: true,
  }
);

export const Guild = model<IGuild>('Guild', GuildSchema);
