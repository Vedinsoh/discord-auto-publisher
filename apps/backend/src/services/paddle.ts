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
 */
const createCheckoutTransaction = async (params: {
  discordGuildId: string;
  discordUserId: string;
  priceId: string;
  paddleCustomerId?: string;
}): Promise<{ transactionId: string }> => {
  try {
    const transaction = await ensurePaddle().transactions.create({
      items: [{ priceId: params.priceId, quantity: 1 }],
      customData: {
        discord_guild_id: params.discordGuildId,
        discord_user_id: params.discordUserId,
      },
      ...(params.paddleCustomerId && { customerId: params.paddleCustomerId }),
    });

    logger.debug(`Created Paddle transaction ${transaction.id} for guild ${params.discordGuildId}`);
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
