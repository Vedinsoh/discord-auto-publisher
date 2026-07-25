import { Channels } from './channels.js';
// MIGRATION: MigratedGuilds cache removed at sunset (DB 5 retired).
import { MigratedGuilds } from './migratedGuilds.js';
import { PremiumPending } from './premiumPending.js';

export const Cache = {
  Channels,
  MigratedGuilds,
  PremiumPending,
};
