import { config, env } from '@ap/config';
import Stripe from 'stripe';
import { logger } from 'utils/logger.js';

const stripe =
  config.isPremiumInstance && env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

const ensureStripe = () => {
  if (!stripe) throw new Error('Stripe is not available in free edition');
  return stripe;
};

const createCheckoutSession = async (params: {
  guildId: string;
  discordUserId: string;
  email?: string;
  priceId: string;
  stripeCustomerId?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionUrl: string }> => {
  try {
    const session = await ensureStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      allow_promotion_codes: true,
      client_reference_id: params.guildId,
      ...(params.stripeCustomerId
        ? { customer: params.stripeCustomerId }
        : params.email
          ? { customer_email: params.email }
          : {}),
      subscription_data: {
        metadata: {
          guildId: params.guildId,
          discordUserId: params.discordUserId,
        },
      },
      metadata: {
        guildId: params.guildId,
        discordUserId: params.discordUserId,
      },
    });

    if (!session.url) {
      throw new Error('Stripe Checkout Session created without URL');
    }

    logger.debug(`Created Stripe Checkout Session ${session.id} for guild ${params.guildId}`);
    return { sessionUrl: session.url };
  } catch (error) {
    logger.error(error, 'Failed to create Stripe Checkout Session');
    throw new Error('Failed to create checkout session');
  }
};

const createPortalSession = async (
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> => {
  try {
    const session = await ensureStripe().billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });
    return session.url;
  } catch (error) {
    logger.error(error, 'Failed to create Stripe portal session');
    throw new Error('Failed to create portal session');
  }
};

const constructWebhookEvent = (rawBody: Buffer, signature: string) => {
  return ensureStripe().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
};

const createCustomer = async (params: {
  email?: string;
  discordUserId: string;
  name?: string;
}): Promise<{ id: string; email: string | null }> => {
  try {
    const customer = await ensureStripe().customers.create({
      ...(params.email && { email: params.email }),
      ...(params.name && { name: params.name }),
      metadata: { discordUserId: params.discordUserId },
    });
    logger.debug(`Created Stripe customer ${customer.id} for Discord user ${params.discordUserId}`);
    return customer;
  } catch (error) {
    logger.error(error, 'Failed to create Stripe customer');
    throw new Error('Failed to create Stripe customer');
  }
};

export const StripeService = {
  createCheckoutSession,
  createPortalSession,
  createCustomer,
};

// Exported separately to avoid leaking Stripe types through the Services aggregate
export { constructWebhookEvent };
