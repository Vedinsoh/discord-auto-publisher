import { BotPermissions } from './botPermissions.js';
import { Channels } from './channels/index.js';
import { Editions } from './editions.js';
import { Entitlements } from './entitlements.js';
import { Guilds } from './guilds.js';
import { Handover } from './handover.js';
import { Info } from './info.js';
import { PaddleService } from './paddle.js';
import { PresenceHeal } from './presenceHeal.js';
import { PublishState } from './publishState.js';
import { Subscriptions } from './subscriptions.js';

export const Services = {
  BotPermissions,
  Channels,
  Editions,
  Entitlements,
  Guilds,
  Handover,
  Info,
  Paddle: PaddleService,
  PresenceHeal,
  PublishState,
  Subscriptions,
};
