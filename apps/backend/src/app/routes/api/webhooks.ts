import { type APIResponse, StatusCodes } from '@ap/express';
import { Data } from 'data/index.js';
import express, { type Request, type Response, type Router } from 'express';
import { Services } from 'services/index.js';
import { emitInvoiceEvent, type InvoiceEventPayload } from 'services/invoicing.js';
import { constructWebhookEvent } from 'services/stripe.js';
import type Stripe from 'stripe';
import { logger } from 'utils/logger.js';

const IDEMPOTENCY_TTL = 86_400; // 24 hours

const isEventProcessed = async (eventId: string): Promise<boolean> => {
  const key = `stripe_event:${eventId}`;
  const exists = await Data.Drivers.Redis.client.exists(key);
  return exists === 1;
};

const markEventProcessed = async (eventId: string): Promise<void> => {
  const key = `stripe_event:${eventId}`;
  await Data.Drivers.Redis.client.set(key, '1', { EX: IDEMPOTENCY_TTL });
};

export const Webhooks: Router = (() => {
  const router = express.Router({ mergeParams: true });

  /**
   * POST /webhooks/stripe
   * Receives Stripe webhook events (raw body, signature-verified)
   */
  router.post('/', async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        message: 'Missing stripe-signature header',
      } as APIResponse);
      return;
    }

    if (!req.body || !Buffer.isBuffer(req.body)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        message: 'Missing or invalid request body',
      } as APIResponse);
      return;
    }

    let event: Stripe.Event;

    try {
      event = constructWebhookEvent(req.body, signature);
    } catch (error) {
      logger.error(error, 'Stripe webhook signature verification failed');
      res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        message: 'Invalid webhook signature',
      } as APIResponse);
      return;
    }

    logger.info(`Stripe webhook: ${event.type} (${event.id})`);

    // Idempotency check
    if (await isEventProcessed(event.id)) {
      logger.debug(`Stripe event ${event.id} already processed, skipping`);
      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: 'Event already processed',
      } as APIResponse);
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          await handleCheckoutSessionCompleted(event);
          break;
        }

        case 'customer.subscription.updated': {
          await handleSubscriptionUpdated(event);
          break;
        }

        case 'customer.subscription.deleted': {
          await handleSubscriptionDeleted(event);
          break;
        }

        case 'invoice.paid': {
          await handleInvoicePaid(event);
          break;
        }

        case 'invoice.payment_failed': {
          await handleInvoicePaymentFailed(event);
          break;
        }

        default:
          logger.debug(`Unhandled Stripe event: ${event.type}`);
      }

      await markEventProcessed(event.id);

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: 'Webhook processed',
      } as APIResponse);
    } catch (error) {
      logger.error(error, 'Stripe webhook processing failed');
      // Still return 200 to prevent Stripe retries on processing errors
      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: 'Webhook received',
      } as APIResponse);
    }
  });

  return router;
})();

async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;

  if (session.mode !== 'subscription') return;

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

  if (!subscriptionId || !customerId) {
    logger.warn('checkout.session.completed missing subscription or customer ID');
    return;
  }

  // Metadata is set on the session and on subscription_data during checkout creation
  const guildId = session.metadata?.guildId;
  const discordUserId = session.metadata?.discordUserId;

  if (!guildId || !discordUserId) {
    logger.warn('checkout.session.completed missing guildId or discordUserId in metadata');
    return;
  }

  // Extract price and interval from line items
  const lineItems = session.line_items?.data ?? [];
  const firstItem = lineItems[0];
  const stripePriceId = firstItem?.price?.id;
  const billingInterval = firstItem?.price?.recurring?.interval === 'year' ? 'year' : 'month';

  // Create subscription record
  await Services.Subscriptions.create({
    guildId,
    stripeSubscriptionId: subscriptionId,
    stripeCustomerId: customerId,
    subscriberDiscordUserId: discordUserId,
    status: 'active',
    stripePriceId: stripePriceId ?? null,
    billingInterval,
    currentPeriodEndsAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
  });

  // Upsert stripe customer mapping
  await Services.StripeCustomers.upsert(
    discordUserId,
    customerId,
    session.customer_details?.email ?? undefined
  );

  logger.info(`Subscription created for guild ${guildId} via checkout`);

  // Emit invoice event to external invoicing service
  if (session.invoice) {
    const invoiceId = typeof session.invoice === 'string' ? session.invoice : session.invoice.id;

    const payload: InvoiceEventPayload = {
      eventType: 'payment.completed',
      idempotencyKey: event.id,
      timestamp: new Date(event.created * 1000).toISOString(),
      customer: {
        stripeCustomerId: customerId,
        discordUserId,
        email: session.customer_details?.email ?? null,
      },
      invoice: {
        stripeInvoiceId: invoiceId,
        amountTotal: session.amount_total ?? 0,
        currency: session.currency ?? 'usd',
        lineItems: lineItems.map(item => ({
          description: item.description ?? '',
          quantity: item.quantity ?? 1,
          unitAmount: item.price?.unit_amount ?? 0,
          stripePriceId: item.price?.id ?? '',
        })),
      },
      subscription: {
        stripeSubscriptionId: subscriptionId,
        guildId,
        billingInterval,
      },
    };

    emitInvoiceEvent(payload);
  }
}

async function handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const sub = event.data.object as Stripe.Subscription;

  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    paused: 'paused',
    trialing: 'trialing',
    incomplete: 'past_due',
    incomplete_expired: 'cancelled',
    unpaid: 'past_due',
  };

  const status = statusMap[sub.status] ?? sub.status;
  const item = sub.items.data[0];
  const stripePriceId = item?.price?.id;
  const billingInterval = item?.price?.recurring?.interval === 'year' ? 'year' : 'month';

  await Services.Subscriptions.update(sub.id, {
    status,
    stripePriceId: stripePriceId ?? undefined,
    billingInterval,
    currentPeriodEndsAt: item?.current_period_end
      ? new Date(item.current_period_end * 1000)
      : undefined,
    ...(sub.status === 'canceled' && {
      cancelledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : new Date(),
    }),
  });

  logger.info(`Subscription ${sub.id} updated to ${status}`);
}

async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const sub = event.data.object as Stripe.Subscription;

  await Services.Subscriptions.update(sub.id, {
    status: 'cancelled',
    cancelledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : new Date(),
  });

  logger.info(`Subscription ${sub.id} deleted/cancelled`);
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | undefined {
  const sub = invoice.parent?.subscription_details?.subscription;
  return typeof sub === 'string' ? sub : sub?.id;
}

async function handleInvoicePaid(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;

  const subscriptionId = getInvoiceSubscriptionId(invoice);

  if (!subscriptionId) return;

  // Confirm subscription is active on successful renewal
  const existingSub = await Services.Subscriptions.getByStripeSubscriptionId(subscriptionId);
  if (existingSub && existingSub.status !== 'active') {
    await Services.Subscriptions.update(subscriptionId, { status: 'active' });
    logger.info(`Subscription ${subscriptionId} reactivated via invoice payment`);
  }

  // Emit invoice event to external invoicing service
  const guildId = existingSub?.guildId;
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

  if (guildId && customerId) {
    const customerMapping = await Services.StripeCustomers.getByStripeCustomerId(customerId);

    const payload: InvoiceEventPayload = {
      eventType: 'payment.completed',
      idempotencyKey: event.id,
      timestamp: new Date(event.created * 1000).toISOString(),
      customer: {
        stripeCustomerId: customerId,
        discordUserId: customerMapping?.discordUserId ?? '',
        email: invoice.customer_email ?? null,
      },
      invoice: {
        stripeInvoiceId: invoice.id,
        amountTotal: invoice.amount_paid ?? 0,
        currency: invoice.currency ?? 'usd',
        lineItems: (invoice.lines?.data ?? []).map(item => {
          const price = item.pricing?.price_details?.price;
          const priceObj = typeof price === 'object' ? price : null;
          return {
            description: item.description ?? '',
            quantity: item.quantity ?? 1,
            unitAmount: priceObj?.unit_amount ?? 0,
            stripePriceId: priceObj?.id ?? (typeof price === 'string' ? price : ''),
          };
        }),
      },
      subscription: {
        stripeSubscriptionId: subscriptionId,
        guildId,
        billingInterval: existingSub?.billingInterval === 'year' ? 'year' : 'month',
      },
    };

    emitInvoiceEvent(payload);
  }
}

async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;

  const subscriptionId = getInvoiceSubscriptionId(invoice);

  if (!subscriptionId) return;

  await Services.Subscriptions.update(subscriptionId, { status: 'past_due' });

  logger.warn(`Payment failed for subscription ${subscriptionId}`);
}
