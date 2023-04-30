import { Schema } from 'mongoose';

export enum BlacklistEventType {
  Unblacklist = 'unblacklist',
  Blacklist = 'blacklist',
}

export interface IBlacklistEvent {
  type: BlacklistEventType;
  reason?: string | null;
}

export const BlacklistEventSchema = new Schema(
  {
    type: {
      type: String,
      enum: Object.values(BlacklistEventType),
      default: BlacklistEventType.Blacklist,
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
