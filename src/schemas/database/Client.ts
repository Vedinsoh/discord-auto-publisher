import { Document, Schema, model } from 'mongoose';

export interface IClient extends Document {
  appId: string;
  guildsCount: number;
}

const ClientSchema = new Schema(
  {
    appId: { type: String, required: true, unique: true },
    guildsCount: { type: Number, default: 0 },
  },
  {
    versionKey: false,
    autoCreate: true,
    timestamps: true,
  }
);

export const Client = model<IClient>('Client', ClientSchema);
