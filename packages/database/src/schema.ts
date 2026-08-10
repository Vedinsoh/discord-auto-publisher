import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export type ChannelFilter = {
  id: string;
  type: string;
  // true = negated operator ("doesn't contain"/"is not")
  negate: boolean;
  values: string[];
  createdAt: Date;
};

export const guild = pgTable('guild', {
  // Discord snowflakes are immutable and never reused — safe natural PK.
  guildId: text('guild_id').primaryKey(),
  // NULL = legacy guild (auto-publishes all announcement channels, pre-v7 model).
  // MIGRATION: dropped together with the MigratedGuilds Redis DB at sunset.
  migratedAt: timestamp('migrated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

export const guildRelations = relations(guild, ({ many }) => ({
  channels: many(channel),
  botPresences: many(botPresence),
}));

// Per-edition bot membership ("bot presence" domain term; unrelated to Discord
// user presence). Row with leftAt = NULL means "this edition's bot is in the guild".
// Kick/leave sets leftAt (guild config preserved for re-invite); reconciliation
// purges the guild once no edition has an active presence for 30 days.
export const botPresence = pgTable(
  'bot_presence',
  {
    guildId: text('guild_id')
      .notNull()
      .references(() => guild.guildId, { onDelete: 'cascade' }),
    edition: text('edition').$type<'free' | 'premium'>().notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull(),
    leftAt: timestamp('left_at', { withTimezone: true }),
  },
  table => [
    primaryKey({ columns: [table.guildId, table.edition] }),
    check('bot_presence_edition_check', sql`${table.edition} IN ('free', 'premium')`),
  ]
);

export const botPresenceRelations = relations(botPresence, ({ one }) => ({
  guild: one(guild, { fields: [botPresence.guildId], references: [guild.guildId] }),
}));

export const channel = pgTable(
  'channel',
  {
    channelId: text('channel_id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guild.guildId, { onDelete: 'cascade' }),
    filters: jsonb('filters').$type<ChannelFilter[]>().default([]).notNull(),
    // How this channel's conditions combine (any = OR, all = AND). Default 'all':
    // the common intent is "publish only messages that satisfy every condition".
    filterMode: text('filter_mode').default('all').notNull(),
    // NULL = serving. Set by the system trim when a guild drops to free-managed
    // over its 3-channel limit: the row + config are retained but the channel is
    // absent from the Channels allowlist and excluded from the limit count.
    // Reactivated (set back to NULL) when the managing edition becomes premium.
    // Only ever written by the trim — never by a user/bot toggle (ADR 0009).
    pausedAt: timestamp('paused_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  table => [index('channel_guild_id_idx').on(table.guildId)]
);

export const channelRelations = relations(channel, ({ one }) => ({
  guild: one(guild, { fields: [channel.guildId], references: [guild.guildId] }),
}));

// No FK to guild: a subscription outlives the guild row (bot kick/guild delete
// must never cancel billing — the subscriber cancels via dashboard/portal).
export const subscription = pgTable('subscription', {
  // Surrogate PK kept deliberately: two candidate keys (guild_id, paddle_subscription_id).
  // A natural PK on guild_id would bake in "one subscription row per guild forever"
  // and block a future history model (row per Paddle subscription).
  id: uuid('id').primaryKey().defaultRandom(),
  guildId: text('guild_id').unique().notNull(),
  paddleSubscriptionId: text('paddle_subscription_id').unique().notNull(),
  paddleCustomerId: text('paddle_customer_id').notNull(),
  // Nullable on purpose: retention erases this id 24 months after the subscription
  // ends while the Paddle ids and dates stay for the accounting window, so NULL means
  // "retained row, subscriber identity already erased" — not missing data. Enforced by
  // the backend's services/retention.ts.
  subscriberDiscordUserId: text('subscriber_discord_user_id'),
  status: text('status').notNull(),
  paddlePriceId: text('paddle_price_id'),
  billingInterval: text('billing_interval'),
  // Paddle `started_at` — contract conclusion. Fixed for the contract's life; a
  // renewal moves currentPeriodStartsAt, never this.
  startedAt: timestamp('started_at', { withTimezone: true }),
  // Anchor of the statutory 14-day withdrawal window (ZZP čl. 79 st. 5). Sticky
  // across renewals — C-565/22 (Sofatutor): a renewal concludes no new contract —
  // and re-stamped only on a price/interval change. ⚠️ Never anchor on
  // currentPeriodStartsAt: it advances every renewal and on proration, which would
  // grant a fresh 14-day full-refund right every billing period.
  withdrawalPeriodStartsAt: timestamp('withdrawal_period_starts_at', { withTimezone: true }),
  // Paddle `current_billing_period.starts_at` — advances every renewal. Pro-rating
  // only, never eligibility. ⚠️ Never derive it by subtracting the interval from
  // currentPeriodEndsAt; proration and plan changes break that arithmetic.
  currentPeriodStartsAt: timestamp('current_period_starts_at', { withTimezone: true }),
  currentPeriodEndsAt: timestamp('current_period_ends_at', { withTimezone: true }),
  scheduledChangeAction: text('scheduled_change_action'),
  scheduledChangeAt: timestamp('scheduled_change_at', { withTimezone: true }),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  // Paddle's updated_at for the applied state — rejects out-of-order webhook deliveries
  lastEventAt: timestamp('last_event_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

/**
 * One row per submitted statutory withdrawal (ZZP čl. 81.a / CRD Art 11a) — the
 * čl. 64 evidence of what the consumer was shown and when. No FK to guild or
 * subscription: the record has to outlive both.
 */
export const withdrawal = pgTable(
  'withdrawal',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guildId: text('guild_id').notNull(),
    paddleSubscriptionId: text('paddle_subscription_id').notNull(),
    // The transaction the refund was raised against, once known.
    paddleTransactionId: text('paddle_transaction_id'),
    // Stored as presented, not as references: the evidence must show what the
    // consumer saw and confirmed, which is a different claim from what the live
    // rows say now.
    consumerName: text('consumer_name').notNull(),
    contractReference: text('contract_reference').notNull(),
    // The only field the consumer fills in (st. 3 t. 3), and the only email address
    // this architecture holds. Nullable on purpose: NULL means "retained row,
    // address already erased". It does not ride the row's 11-year clock — collecting
    // it is an obligation discharged by sending — and erasure additionally requires
    // acknowledgedAt (see services/retention.ts).
    notificationAddress: text('notification_address'),
    // st. 7 — timeliness is decided by submission. Stamped by the service, not
    // defaulted, so the intent survives a schema edit.
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull(),
    // ⚠️ Necessarily equal to submittedAt: one sending event, one insert. Two columns
    // because they answer two questions — st. 7 timeliness reads submittedAt, while
    // `confirmedAt IS NOT NULL` is what "a withdrawal happened" means to retention
    // and the retry sweep. Never reintroduce a row where this is NULL.
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    // st. 6 — set only once the acknowledgement actually left. NULL after a confirm
    // means a statutory duty is outstanding; the sender retries and alerts.
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    // Paddle adjustment `status:id`, or a failure reason. Requested is not approved —
    // outside auto-approval the adjustment goes to manual review.
    refundOutcome: text('refund_outcome'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  table => [
    index('withdrawal_guild_id_idx').on(table.guildId),
    index('withdrawal_subscription_id_idx').on(table.paddleSubscriptionId),
    // One contract, one withdrawal — the double-confirm guard. The route's
    // pre-check is not atomic with the insert and the effects include a refund, so
    // two concurrent confirms would otherwise raise two Paddle adjustments. Scoped
    // to the subscription, not the guild, so a re-subscribe gets its own row.
    uniqueIndex('withdrawal_confirmed_subscription_unique')
      .on(table.paddleSubscriptionId)
      .where(sql`${table.confirmedAt} is not null`),
  ]
);

export type Guild = typeof guild.$inferSelect;
export type Channel = typeof channel.$inferSelect;
export type BotPresence = typeof botPresence.$inferSelect;
export type NewBotPresence = typeof botPresence.$inferInsert;
export type Subscription = typeof subscription.$inferSelect;
export type NewSubscription = typeof subscription.$inferInsert;
export type Withdrawal = typeof withdrawal.$inferSelect;
export type NewWithdrawal = typeof withdrawal.$inferInsert;
