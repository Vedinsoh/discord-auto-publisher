import { db, type StripeCustomer, stripeCustomer } from '@ap/database';
import { eq } from 'drizzle-orm';
import { logger } from 'utils/logger.js';

const getByDiscordUserId = async (discordUserId: string): Promise<StripeCustomer | undefined> => {
  try {
    const [row] = await db
      .select()
      .from(stripeCustomer)
      .where(eq(stripeCustomer.discordUserId, discordUserId))
      .limit(1);
    return row;
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to retrieve stripe customer by discordUserId');
  }
};

const getByStripeCustomerId = async (stripeCustId: string): Promise<StripeCustomer | undefined> => {
  try {
    const [row] = await db
      .select()
      .from(stripeCustomer)
      .where(eq(stripeCustomer.stripeCustomerId, stripeCustId))
      .limit(1);
    return row;
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to retrieve stripe customer by stripeCustomerId');
  }
};

const upsert = async (
  discordUserId: string,
  stripeCustId: string,
  email?: string
): Promise<StripeCustomer> => {
  try {
    const [row] = await db
      .insert(stripeCustomer)
      .values({
        discordUserId,
        stripeCustomerId: stripeCustId,
        email,
      })
      .onConflictDoUpdate({
        target: stripeCustomer.discordUserId,
        set: {
          stripeCustomerId: stripeCustId,
          ...(email && { email }),
        },
      })
      .returning();
    if (!row) throw new Error('Upsert returned no rows');
    logger.debug(`Upserted stripe customer for Discord user ${discordUserId}`);
    return row;
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to upsert stripe customer');
  }
};

export const StripeCustomers = {
  getByDiscordUserId,
  getByStripeCustomerId,
  upsert,
};
