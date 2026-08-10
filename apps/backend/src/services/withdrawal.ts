import { db, type Subscription, type Withdrawal, withdrawal } from '@ap/database';
import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { alerter } from 'utils/alerts.js';
import { logger } from 'utils/logger.js';
import { Email } from './email.js';
import { Entitlements } from './entitlements.js';
import { PaddleService } from './paddle.js';
import { Subscriptions } from './subscriptions.js';

/**
 * The statutory withdrawal function — ZZP čl. 81.a (in force 19 June 2026),
 * transposing CRD Art 11a. One screen, one button, one request; nothing may sit
 * between the control and the confirmation (no survey, no retention offer). The
 * full reasoning and the rules a change here would break are in .claude/CLAUDE.md.
 */

const WINDOW_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Contract conclusion — čl. 79 st. 5 runs the 14 days from it, and C-565/22
 * (Sofatutor) means a renewal concludes nothing new. Never use
 * `currentPeriodStartsAt`: it advances on renewal and proration.
 *
 * The fallbacks exist so a missing value can never deny the control to a consumer
 * inside their window; failing closed on a statutory right is the unsafe direction.
 */
const contractConcludedAt = (sub: Subscription): Date =>
  sub.withdrawalPeriodStartsAt ?? sub.startedAt ?? sub.createdAt;

/** Last instant the consumer may submit the statement (st. 7 measures submission). */
const windowEndsAt = (sub: Subscription): Date =>
  new Date(contractConcludedAt(sub).getTime() + WINDOW_DAYS * DAY_MS);

/**
 * Keyed to the window and nothing else — never status, never a scheduled
 * cancellation. A consumer who cancelled on day 3 still has until day 14. Do not
 * add a status condition here.
 */
const isWithinWindow = (sub: Subscription, now: Date = new Date()): boolean =>
  now < windowEndsAt(sub);

const INTERVAL_LABELS: Record<string, string> = {
  month: 'monthly',
  year: 'yearly',
};

/** Readable local time plus the machine form — st. 6 owes date AND time. */
const formatInstant = (date: Date): string => {
  // Explicit components, not dateStyle/timeStyle: Intl throws when either is
  // combined with timeZoneName, and the zone label is the point here.
  const local = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zagreb',
    timeZoneName: 'short',
  }).format(date);
  return `${local} (${date.toISOString()})`;
};

/**
 * The statement's name and contract details, composed server-side and stored as
 * presented — never accepted from the client. This is the čl. 64 evidence of what
 * the consumer was shown, so displayed and stored must be the same value.
 */
const composeStatement = (
  sub: Subscription,
  consumerName: string,
  guildName: string | null
): { consumerName: string; contractReference: string } => {
  const interval = sub.billingInterval ? INTERVAL_LABELS[sub.billingInterval] : null;
  const server = guildName ? `${guildName} (${sub.guildId})` : sub.guildId;

  return {
    consumerName,
    contractReference: [
      `Auto Publisher Premium${interval ? `, ${interval} subscription` : ''}`,
      `Discord server: ${server}`,
      `Subscription reference: ${sub.paddleSubscriptionId}`,
      `Contract concluded: ${formatInstant(contractConcludedAt(sub))}`,
    ].join('\n'),
  };
};

/**
 * Contract identification for display only, never stored. Art 11a(2)(b) lets the
 * consumer "provide or confirm" it, and confirming something never shown is not
 * confirming — so the plan and the server name must be on screen. The guild id is
 * deliberately not: it identifies nothing to a human. The stored
 * `contractReference` stays long-form; it is evidence, not UI.
 */
const composeContractDisplay = (
  sub: Subscription,
  guildName: string | null
): { server: string; plan: string } => {
  const interval = sub.billingInterval ? INTERVAL_LABELS[sub.billingInterval] : null;
  return {
    server: guildName ?? `Server ${sub.guildId}`,
    plan: `Auto Publisher Premium${interval ? ` (${interval})` : ''}`,
  };
};

/** The acknowledgement body (st. 6): the statement's content plus `submittedAt`. */
const composeAcknowledgement = (record: Withdrawal): { subject: string; text: string } => ({
  subject: 'Confirmation of receipt — withdrawal from contract (potvrda o primitku raskida)',
  text: [
    'This is confirmation that we have received your notice of withdrawal from contract',
    '(potvrda o primitku obavijesti o raskidu), as required by article 81.a of the Croatian',
    'Consumer Protection Act. Keep this message — it is your record of the withdrawal.',
    '',
    `DATE AND TIME OF SUBMISSION: ${formatInstant(record.submittedAt)}`,
    '',
    'YOUR STATEMENT, AS SUBMITTED',
    '',
    `Name: ${record.consumerName}`,
    '',
    'Contract withdrawn from:',
    record.contractReference,
    '',
    `Confirmation sent to: ${record.notificationAddress}`,
    '',
    'WHAT HAPPENS NEXT',
    '',
    // Not "returns to the free edition": the premium bot leaves and Discord has no
    // way for a bot to re-add itself, so the server may be left with none.
    'Your Premium subscription ends now. Your channel configuration and publishing rules are',
    'kept, so nothing needs setting up again.',
    '',
    'One step is needed from you: if the Premium bot had replaced the free bot in your server,',
    'you will need to invite the free bot back before publishing resumes. Discord does not let',
    'a bot add itself to a server, so we cannot do this for you. The invite link is on your',
    'dashboard.',
    '',
    'Your refund is issued by Paddle, the merchant of record, to the payment method you used.',
    'We have raised it with Paddle; the time it takes to appear on your statement is set by',
    'your bank or card issuer.',
    '',
    'If anything here is wrong, reply to this message.',
    '',
    'Auto Publisher — PWN d.o.o., Selska ulica 25, 42242 Tužno, Croatia',
  ].join('\n'),
});

/** The most recent statement for a subscription, confirmed or not. */
const findLatest = async (paddleSubscriptionId: string): Promise<Withdrawal | undefined> => {
  const [row] = await db
    .select()
    .from(withdrawal)
    .where(eq(withdrawal.paddleSubscriptionId, paddleSubscriptionId))
    .orderBy(desc(withdrawal.submittedAt))
    .limit(1);
  return row;
};

/**
 * Writes the whole statement in one action — Art 11a has exactly one sending event,
 * so there is no draft stage and `submittedAt` equals `confirmedAt`. Never
 * reintroduce a row where `confirmedAt` is null.
 *
 * `onConflictDoNothing` + the partial unique index is the double-confirm guard: the
 * caller's already-withdrawn check is not atomic with this insert and the effects
 * include a refund, so `undefined` means "already withdrawn", not "write failed".
 */
const record = async (params: {
  sub: Subscription;
  consumerName: string;
  guildName: string | null;
  notificationAddress: string;
}): Promise<Withdrawal | undefined> => {
  const { sub, notificationAddress } = params;
  const statement = composeStatement(sub, params.consumerName, params.guildName);
  const now = new Date();

  const [created] = await db
    .insert(withdrawal)
    .values({
      guildId: sub.guildId,
      paddleSubscriptionId: sub.paddleSubscriptionId,
      ...statement,
      notificationAddress,
      submittedAt: now,
      confirmedAt: now,
    })
    .onConflictDoNothing()
    .returning();

  if (!created) {
    logger.warn(`Withdrawal already recorded for subscription ${sub.paddleSubscriptionId}`);
    return undefined;
  }

  logger.info(`Recorded withdrawal ${created.id} for guild ${sub.guildId}`);
  return created;
};

const markAcknowledged = async (id: string): Promise<void> => {
  await db.update(withdrawal).set({ acknowledgedAt: new Date() }).where(eq(withdrawal.id, id));
};

const recordRefundOutcome = async (
  id: string,
  outcome: string,
  paddleTransactionId?: string
): Promise<void> => {
  await db
    .update(withdrawal)
    .set({ refundOutcome: outcome, ...(paddleTransactionId ? { paddleTransactionId } : {}) })
    .where(eq(withdrawal.id, id));
};

/** Statements confirmed but never acknowledged — the retry sweep's input (st. 6). */
const findUnacknowledged = async (): Promise<Withdrawal[]> =>
  db
    .select()
    .from(withdrawal)
    .where(and(isNotNull(withdrawal.confirmedAt), isNull(withdrawal.acknowledgedAt)))
    .orderBy(desc(withdrawal.submittedAt));

const REFUND_REASON = 'Statutory withdrawal within 14 days (ZZP čl. 81.a / CRD Art 11a)';

/**
 * st. 6 — one attempt inline while the consumer waits, then alerted and retried by
 * {@link retryUnacknowledged}. `acknowledgedAt` is stamped only on an accepted
 * send: a row claiming a statutory confirmation went out when it did not is worse
 * than no row.
 */
const acknowledge = async (record: Withdrawal): Promise<boolean> => {
  const { subject, text } = composeAcknowledgement(record);

  // Unreachable by construction (retention erases the address only once
  // `acknowledgedAt` is set), but never stamp the duty done with nowhere to send.
  if (!record.notificationAddress) {
    logger.error(`Withdrawal ${record.id}: no notification address — cannot acknowledge`);
    alerter.send(`withdrawal-ack-no-address:${record.id}`, {
      title: 'Withdrawal acknowledgement has no address',
      description: `Withdrawal \`${record.id}\` (guild ${record.guildId}) is confirmed but its notification address is gone, so the čl. 81.a st. 6 acknowledgement cannot be sent. This should be impossible — check services/retention.ts.`,
    });
    return false;
  }

  try {
    await Email.send({ to: record.notificationAddress, subject, text });
    await markAcknowledged(record.id);
    return true;
  } catch (error) {
    logger.error(error, `Withdrawal ${record.id}: acknowledgement send failed`);
    alerter.send(`withdrawal-ack-failed:${record.id}`, {
      title: 'Withdrawal acknowledgement not sent',
      description: `Withdrawal \`${record.id}\` (guild ${record.guildId}) was confirmed but the statutory acknowledgement to \`${record.notificationAddress}\` failed. ZZP čl. 81.a st. 6 requires it without delay. The retry sweep will keep trying; check SMTP.`,
    });
    return false;
  }
};

/** Raises the refund and records the outcome. Never throws — the withdrawal already happened. */
const refund = async (record: Withdrawal, sub: Subscription): Promise<string | null> => {
  // Hoisted out of the try so a failure still records WHICH transaction needs
  // refunding by hand — the observed failure mode (missing API-key scope) throws
  // after this lookup succeeds.
  let transactionId: string | null = null;

  try {
    transactionId = await PaddleService.findRefundableTransaction(sub.paddleSubscriptionId);

    if (!transactionId) {
      // A real state, not a failure: a trial that never billed. Recorded anyway so
      // the row says why no money moved.
      await recordRefundOutcome(record.id, 'no_completed_transaction');
      return null;
    }

    const { adjustmentId, status } = await PaddleService.refundTransaction({
      transactionId,
      reason: REFUND_REASON,
    });
    await recordRefundOutcome(record.id, `${status}:${adjustmentId}`, transactionId);
    return status;
  } catch (error) {
    logger.error(error, `Withdrawal ${record.id}: refund failed`);
    await recordRefundOutcome(
      record.id,
      `failed: ${error instanceof Error ? error.message : 'unknown'}`,
      transactionId ?? undefined
    );
    alerter.send(`withdrawal-refund-failed:${record.id}`, {
      title: 'Withdrawal refund not raised',
      description: `Withdrawal \`${record.id}\` (guild ${record.guildId}, subscription \`${sub.paddleSubscriptionId}\`) was confirmed but no Paddle refund could be raised. ${transactionId ? `Refund transaction \`${transactionId}\` manually` : 'No refundable transaction was identified — check Paddle for a completed payment'} — the consumer has already withdrawn.`,
    });
    return null;
  }
};

/**
 * Ends the contract immediately (čl. 83 st. 9), through the same path a webhook
 * takes so one place decides what an entitlement transition means. Never throws —
 * the nightly reconcile is the backstop.
 */
const endContract = async (record: Withdrawal, sub: Subscription): Promise<void> => {
  try {
    const updated = await PaddleService.cancelSubscriptionImmediately(sub.paddleSubscriptionId);
    const { previous, current } = await Subscriptions.applyPaddleSubscription(updated);
    await Entitlements.enforceTransition(previous, current);
  } catch (error) {
    logger.error(error, `Withdrawal ${record.id}: could not end subscription`);
    alerter.send(`withdrawal-cancel-failed:${record.id}`, {
      title: 'Withdrawal did not end the subscription',
      description: `Withdrawal \`${record.id}\` (guild ${record.guildId}) was confirmed but subscription \`${sub.paddleSubscriptionId}\` is still running. Cancel it in Paddle — the consumer has withdrawn and must not be billed again.`,
    });
  }
};

/**
 * The three effects, in statutory order. The acknowledgement goes first and is never
 * contingent on the refund — st. 6 owes it without delay. None of the three can undo
 * the withdrawal; it took effect on submission.
 */
const applyEffects = async (
  record: Withdrawal,
  sub: Subscription
): Promise<{ acknowledged: boolean; refundStatus: string | null }> => {
  const acknowledged = await acknowledge(record);
  const refundStatus = await refund(record, sub);
  await endContract(record, sub);
  return { acknowledged, refundStatus };
};

/**
 * Retry sweep for acknowledgements that never left — st. 6's "without delay"
 * survives an SMTP outage only if something keeps trying.
 */
const retryUnacknowledged = async (): Promise<void> => {
  const pending = await findUnacknowledged();
  if (pending.length === 0) return;

  logger.warn(`Retrying ${pending.length} unsent withdrawal acknowledgement(s)`);
  for (const record of pending) await acknowledge(record);
};

export const Withdrawals = {
  WINDOW_DAYS,
  contractConcludedAt,
  windowEndsAt,
  isWithinWindow,
  composeStatement,
  composeContractDisplay,
  composeAcknowledgement,
  findLatest,
  record,
  applyEffects,
  retryUnacknowledged,
};
