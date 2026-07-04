import { config, env } from '@ap/config';
import {
  Environment,
  type EventEntity,
  Paddle,
  type Subscription as PaddleSubscription,
} from '@paddle/paddle-node-sdk';
import { logger } from 'utils/logger.js';

const paddle =
  config.isPremiumInstance && env.PADDLE_API_KEY
    ? new Paddle(env.PADDLE_API_KEY, {
        environment:
          env.PADDLE_ENVIRONMENT === 'production' ? Environment.production : Environment.sandbox,
      })
    : null;

const ensurePaddle = () => {
  if (!paddle) throw new Error('Paddle is not available in free edition');
  return paddle;
};

/**
 * Creates a Paddle transaction for the overlay checkout.
 * custom_data is server-set so webhooks can trust guildId/discordUserId.
 */
const createCheckoutTransaction = async (params: {
  guildId: string;
  discordUserId: string;
  priceId: string;
  paddleCustomerId?: string;
}): Promise<{ transactionId: string }> => {
  try {
    const transaction = await ensurePaddle().transactions.create({
      items: [{ priceId: params.priceId, quantity: 1 }],
      customData: {
        guildId: params.guildId,
        discordUserId: params.discordUserId,
      },
      ...(params.paddleCustomerId && { customerId: params.paddleCustomerId }),
    });

    logger.debug(`Created Paddle transaction ${transaction.id} for guild ${params.guildId}`);
    return { transactionId: transaction.id };
  } catch (error) {
    logger.error(error, 'Failed to create Paddle transaction');
    throw new Error('Failed to create checkout transaction');
  }
};

/**
 * Creates a Customer Portal session and returns the overview URL.
 */
const createPortalSession = async (
  paddleCustomerId: string,
  paddleSubscriptionId?: string
): Promise<string> => {
  try {
    const session = await ensurePaddle().customerPortalSessions.create(
      paddleCustomerId,
      paddleSubscriptionId ? [paddleSubscriptionId] : []
    );
    return session.urls.general.overview;
  } catch (error) {
    logger.error(error, 'Failed to create Paddle portal session');
    throw new Error('Failed to create portal session');
  }
};

/**
 * Fetches a Paddle customer's email (used to populate the local mapping).
 */
const getCustomerEmail = async (paddleCustomerId: string): Promise<string | undefined> => {
  try {
    const customer = await ensurePaddle().customers.get(paddleCustomerId);
    return customer.email ?? undefined;
  } catch (error) {
    logger.warn(error, `Failed to fetch Paddle customer ${paddleCustomerId}`);
    return undefined;
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
  getCustomerEmail,
  listAllSubscriptions,
};

// Exported separately to avoid leaking Paddle types through the Services aggregate
export { unmarshalWebhook };
