import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
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

export type Guild = typeof guild.$inferSelect;
export type Channel = typeof channel.$inferSelect;
export type BotPresence = typeof botPresence.$inferSelect;
export type NewBotPresence = typeof botPresence.$inferInsert;
export type Subscription = typeof subscription.$inferSelect;
export type NewSubscription = typeof subscription.$inferInsert;
