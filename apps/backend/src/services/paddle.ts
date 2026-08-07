import { env } from '@ap/config';
import {
  Environment,
  type EventEntity,
  Paddle,
  type Subscription as PaddleSubscription,
} from '@paddle/paddle-node-sdk';
import { logger } from 'utils/logger.js';

const paddle = env.PADDLE_API_KEY
  ? new Paddle(env.PADDLE_API_KEY, {
      environment:
        env.PADDLE_ENVIRONMENT === 'production' ? Environment.production : Environment.sandbox,
    })
  : null;

const ensurePaddle = () => {
  if (!paddle) throw new Error('PADDLE_API_KEY is not configured');
  return paddle;
};

/**
 * Creates a Paddle transaction for the overlay checkout.
 * custom_data is server-set so webhooks can trust discord_guild_id/discord_user_id.
 *
 * The terms acceptance rides along in custom_data because that is the only store
 * attached to the purchase itself: it survives independently of our own database and
 * comes back on every webhook, so the evidence of what the buyer accepted cannot
 * drift away from the transaction it belongs to. `terms_accepted_at` is stamped here
 * rather than taken from the client — a self-reported timestamp proves nothing.
 */
const createCheckoutTransaction = async (params: {
  discordGuildId: string;
  discordUserId: string;
  priceId: string;
  termsVersion: string;
}): Promise<{ transactionId: string }> => {
  try {
    // No customerId: the transaction stays open so the checkout collects address
    // + optional business/VAT details. Paddle resolves/links the customer by the
    // email entered at checkout.
    const transaction = await ensurePaddle().transactions.create({
      items: [{ priceId: params.priceId, quantity: 1 }],
      customData: {
        discord_guild_id: params.discordGuildId,
        discord_user_id: params.discordUserId,
        terms_version: params.termsVersion,
        terms_accepted_at: new Date().toISOString(),
      },
    });

    logger.debug(`Created Paddle transaction ${transaction.id} for guild ${params.discordGuildId}`);
    return { transactionId: transaction.id };
  } catch (error) {
    logger.error(error, 'Failed to create Paddle transaction');
    throw new Error('Failed to create checkout transaction');
  }
};

/**
 * Creates a Customer Portal session and returns deep links into the portal.
 *
 * `manageUrl`: when a subscription ID is passed we return its
 * `updateSubscriptionPaymentMethod` deep link, NOT `general.overview`: it lands the
 * customer on *that* subscription's page in the portal (cancel, plan, invoices all
 * reachable from there), whereas `general.overview` is account-wide and lists every
 * subscription the customer has. The button is opened from a specific guild's
 * settings, so it must target that guild's subscription. Do not "simplify" this back
 * to `general.overview`. Falls back to the overview if Paddle returns no
 * per-subscription link.
 *
 * `cancelUrl`: the sibling link, surfaced separately so the dashboard can offer
 * cancellation as its own labelled action instead of hiding it one hop inside the
 * portal. Null when Paddle returns no per-subscription entry — the overview fallback
 * is deliberately NOT reused for it, because a button labelled "cancel" that opens an
 * account overview misdescribes what it does.
 *
 * ⚠️ This is a CANCELLATION link, not a withdrawal one. It schedules the subscription
 * to end at the close of the current billing period and refunds nothing. It does not
 * satisfy the ZZP čl. 81.a / CRD Art 11a withdrawal function, and any UI built on it
 * must not imply a refund. See docs/withdrawal-function-spec.md.
 */
const createPortalSession = async (
  paddleCustomerId: string,
  paddleSubscriptionId?: string
): Promise<{ manageUrl: string; cancelUrl: string | null }> => {
  try {
    const session = await ensurePaddle().customerPortalSessions.create(
      paddleCustomerId,
      paddleSubscriptionId ? [paddleSubscriptionId] : []
    );
    const subscriptionUrls = session.urls.subscriptions[0];
    return {
      manageUrl: subscriptionUrls?.updateSubscriptionPaymentMethod ?? session.urls.general.overview,
      cancelUrl: subscriptionUrls?.cancelSubscription ?? null,
    };
  } catch (error) {
    logger.error(error, 'Failed to create Paddle portal session');
    throw new Error('Failed to create portal session');
  }
};

/**
 * Iterates all subscriptions in Paddle (all statuses) — reconciliation cron input.
 */
async function* listAllSubscriptions(): AsyncGenerator<PaddleSubscription> {
  const collection = ensurePaddle().subscriptions.list({ perPage: 200 });
  for await (const sub of collection) {
    yield sub;
  }
}

/**
 * Verifies the Paddle-Signature header and parses the event.
 */
const unmarshalWebhook = (rawBody: string, signature: string): Promise<EventEntity> => {
  return ensurePaddle().webhooks.unmarshal(rawBody, env.PADDLE_WEBHOOK_SECRET, signature);
};

export const PaddleService = {
  createCheckoutTransaction,
  createPortalSession,
  listAllSubscriptions,
};

// Exported separately to avoid leaking Paddle types through the Services aggregate
export { unmarshalWebhook };
