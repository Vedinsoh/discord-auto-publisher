import { Document, Schema, model } from 'mongoose';
import { BlacklistEventSchema, IBlacklistEvent } from '#schemas/database/BlacklistEvent';

export interface IGuild extends Document {
  guildId: string;
  isBlacklisted: boolean;
  blacklistEvents: IBlacklistEvent[];
}

const GuildSchema = new Schema(
  {
    guildId: { type: String, required: true, unique: true },
    isBlacklisted: { type: Boolean, default: false },
    blacklistEvents: {
      type: [BlacklistEventSchema],
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
