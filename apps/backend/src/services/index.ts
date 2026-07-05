import { Channels } from './channels/index.js';
import { Entitlements } from './entitlements.js';
import { Guilds } from './guilds.js';
import { Info } from './info.js';
import { LegacyPerms } from './legacyPerms.js';
import { PaddleService } from './paddle.js';
import { PaddleCustomers } from './paddleCustomers.js';
import { Subscriptions } from './subscriptions.js';

export const Services = {
  Channels,
  Entitlements,
  Guilds,
  Info,
  LegacyPerms,
  Paddle: PaddleService,
  PaddleCustomers,
  Subscriptions,
};
