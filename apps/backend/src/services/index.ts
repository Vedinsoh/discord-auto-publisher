import { Channels } from './channels/index.js';
import { Guilds } from './guilds.js';
import { Info } from './info.js';
import { PaddleService } from './paddle.js';
import { PaddleCustomers } from './paddleCustomers.js';
import { Subscriptions } from './subscriptions.js';

export const Services = {
  Channels,
  Guilds,
  Info,
  Paddle: PaddleService,
  PaddleCustomers,
  Subscriptions,
};
