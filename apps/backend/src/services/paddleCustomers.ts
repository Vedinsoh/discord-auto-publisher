import { db, type PaddleCustomer, paddleCustomer } from '@ap/database';
import { eq } from 'drizzle-orm';
import { logger } from 'utils/logger.js';

const getByDiscordUserId = async (discordUserId: string): Promise<PaddleCustomer | undefined> => {
  try {
    const [row] = await db
      .select()
      .from(paddleCustomer)
      .where(eq(paddleCustomer.discordUserId, discordUserId))
      .limit(1);
    return row;
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to retrieve paddle customer by discordUserId');
  }
};

const getByPaddleCustomerId = async (paddleCustId: string): Promise<PaddleCustomer | undefined> => {
  try {
    const [row] = await db
      .select()
      .from(paddleCustomer)
      .where(eq(paddleCustomer.paddleCustomerId, paddleCustId))
      .limit(1);
    return row;
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to retrieve paddle customer by paddleCustomerId');
  }
};

const upsert = async (
  discordUserId: string,
  paddleCustId: string,
  email?: string
): Promise<PaddleCustomer> => {
  try {
    const [row] = await db
      .insert(paddleCustomer)
      .values({
        discordUserId,
        paddleCustomerId: paddleCustId,
        email,
      })
      .onConflictDoUpdate({
        target: paddleCustomer.discordUserId,
        set: {
          paddleCustomerId: paddleCustId,
          ...(email && { email }),
        },
      })
      .returning();
    if (!row) throw new Error('Upsert returned no rows');
    logger.debug(`Upserted paddle customer for Discord user ${discordUserId}`);
    return row;
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to upsert paddle customer');
  }
};

export const PaddleCustomers = {
  getByDiscordUserId,
  getByPaddleCustomerId,
  upsert,
};
