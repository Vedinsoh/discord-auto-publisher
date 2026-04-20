import { createHmac } from 'node:crypto';
import { env } from '@ap/config';
import { logger } from 'utils/logger.js';

export interface InvoiceEventPayload {
  eventType: 'payment.completed' | 'payment.refunded';
  idempotencyKey: string;
  timestamp: string;
  customer: {
    stripeCustomerId: string;
    discordUserId: string;
    email: string | null;
  };
  invoice: {
    stripeInvoiceId: string;
    amountTotal: number;
    currency: string;
    lineItems: Array<{
      description: string;
      quantity: number;
      unitAmount: number;
      stripePriceId: string;
    }>;
  };
  subscription: {
    stripeSubscriptionId: string;
    guildId: string;
    billingInterval: 'month' | 'year';
  };
}

const signPayload = (body: string, secret: string): string => {
  return createHmac('sha256', secret).update(body).digest('hex');
};

export const emitInvoiceEvent = async (payload: InvoiceEventPayload): Promise<void> => {
  if (!env.INVOICING_WEBHOOK_URL) {
    logger.debug('Invoicing webhook URL not configured, skipping');
    return;
  }

  const body = JSON.stringify(payload);
  const timestamp = Date.now().toString();

  try {
    const signature = env.INVOICING_WEBHOOK_SECRET
      ? signPayload(`${timestamp}.${body}`, env.INVOICING_WEBHOOK_SECRET)
      : '';

    const response = await fetch(env.INVOICING_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': timestamp,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      logger.warn(`Invoicing webhook returned ${response.status}`);
    } else {
      logger.debug(`Invoicing event emitted: ${payload.eventType} (${payload.idempotencyKey})`);
    }
  } catch (error) {
    logger.warn(error, 'Failed to emit invoicing event (non-fatal)');
  }
};
