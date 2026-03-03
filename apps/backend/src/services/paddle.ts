import { config, env } from '@ap/config';
import { Environment, EventName, Paddle } from '@paddle/paddle-node-sdk';
import { logger } from 'utils/logger.js';

const paddle = config.isPremiumInstance
  ? new Paddle(env.PADDLE_API_KEY, {
      environment:
        env.PADDLE_ENVIRONMENT === 'sandbox' ? Environment.sandbox : Environment.production,
    })
  : null;

const ensurePaddle = () => {
  if (!paddle) throw new Error('Paddle is not available in free edition');
  return paddle;
};

const unmarshalWebhook = async (rawBody: string, signature: string) => {
  try {
    return await ensurePaddle().webhooks.unmarshal(rawBody, env.PADDLE_WEBHOOK_SECRET, signature);
  } catch (error) {
    logger.error(error, 'Paddle webhook signature verification failed');
    throw error;
  }
};

const createTransaction = async (
  guildId: string,
  discordUserId: string,
  email: string | undefined,
  priceId: string
): Promise<{ transactionId: string }> => {
  try {
    const transaction = await ensurePaddle().transactions.create({
      items: [{ priceId, quantity: 1 }],
      customData: { guildId, discordUserId },
      ...(email && { customerIpAddress: undefined }),
    });
    logger.debug(`Created Paddle transaction ${transaction.id} for guild ${guildId}`);
    return { transactionId: transaction.id };
  } catch (error) {
    logger.error(error, 'Failed to create Paddle transaction');
    throw new Error('Failed to create Paddle transaction');
  }
};

const getCustomerPortalUrl = async (
  paddleCustomerId: string,
  subscriptionIds: string[]
): Promise<string> => {
  try {
    const session = await ensurePaddle().customerPortalSessions.create(
      paddleCustomerId,
      subscriptionIds
    );
    return session.urls.general.overview;
  } catch (error) {
    logger.error(error, 'Failed to get customer portal URL');
    throw new Error('Failed to get customer portal URL');
  }
};

export const PaddleService = {
  unmarshalWebhook,
  createTransaction,
  getCustomerPortalUrl,
  EventName,
};
