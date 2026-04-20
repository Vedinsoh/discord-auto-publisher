import { Channels } from './channels/index.js';
import { Guilds } from './guilds.js';
import { Info } from './info.js';
import { StripeService } from './stripe.js';
import { StripeCustomers } from './stripeCustomers.js';
import { Subscriptions } from './subscriptions.js';

export const Services = {
  Channels,
  Guilds,
  Info,
  Stripe: StripeService,
  StripeCustomers,
  Subscriptions,
};
