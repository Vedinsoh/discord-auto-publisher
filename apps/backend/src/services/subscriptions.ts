import { db, type NewSubscription, type Subscription, subscription } from '@ap/database';
import { and, eq, lt, notInArray } from 'drizzle-orm';
import { logger } from 'utils/logger.js';

const getByGuildId = async (guildId: string): Promise<Subscription | undefined> => {
  try {
    const [row] = await db
      .select()
      .from(subscription)
      .where(eq(subscription.guildId, guildId))
      .limit(1);
    return row;
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to retrieve subscription by guildId');
  }
};

const getByPaddleSubscriptionId = async (
  paddleSubId: string
): Promise<Subscription | undefined> => {
  try {
    const [row] = await db
      .select()
      .from(subscription)
      .where(eq(subscription.paddleSubscriptionId, paddleSubId))
      .limit(1);
    return row;
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to retrieve subscription by paddleSubscriptionId');
  }
};

const create = async (data: NewSubscription): Promise<Subscription> => {
  try {
    const [row] = await db.insert(subscription).values(data).returning();
    if (!row) throw new Error('Insert returned no rows');
    logger.debug(`Created subscription for guild ${data.guildId}`);
    return row;
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to create subscription');
  }
};

const update = async (
  paddleSubId: string,
  data: Partial<Omit<Subscription, 'id' | 'createdAt'>>
): Promise<Subscription | undefined> => {
  try {
    const [row] = await db
      .update(subscription)
      .set(data)
      .where(eq(subscription.paddleSubscriptionId, paddleSubId))
      .returning();
    if (row) {
      logger.debug(`Updated subscription ${paddleSubId}`);
    }
    return row;
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to update subscription');
  }
};

const isActive = async (guildId: string): Promise<boolean> => {
  try {
    const row = await getByGuildId(guildId);
    if (!row) return false;
    return row.status === 'active' || row.status === 'trialing';
  } catch (error) {
    logger.error(error);
    return false;
  }
};

const getBySubscriber = async (discordUserId: string): Promise<Subscription[]> => {
  try {
    return await db
      .select()
      .from(subscription)
      .where(eq(subscription.subscriberDiscordUserId, discordUserId));
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to retrieve subscriptions by subscriber');
  }
};

const getExpired = async (): Promise<Subscription[]> => {
  try {
    return await db
      .select()
      .from(subscription)
      .where(
        and(
          notInArray(subscription.status, ['active', 'trialing']),
          lt(subscription.currentPeriodEndsAt, new Date())
        )
      );
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to retrieve expired subscriptions');
  }
};

export const Subscriptions = {
  getByGuildId,
  getByPaddleSubscriptionId,
  create,
  update,
  isActive,
  getBySubscriber,
  getExpired,
};
