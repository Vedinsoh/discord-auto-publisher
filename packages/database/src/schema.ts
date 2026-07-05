import { relations } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export type ChannelFilter = {
  id: string;
  type: string;
  mode: string;
  values: string[];
  createdAt: Date;
};

export const guild = pgTable('guild', {
  id: uuid('id').primaryKey().defaultRandom(),
  guildId: text('guild_id').unique().notNull(),
  // NULL = legacy guild (auto-publishes all announcement channels, pre-v7 model).
  // MIGRATION: dropped together with the MigratedGuilds Redis DB at sunset.
  migratedAt: timestamp('migrated_at', { withTimezone: true }),
  // Soft delete: row with deletedAt = NULL means "bot is in this guild".
  // Kick/leave sets it (config preserved); reconciliation purges after 30 days.
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

export const guildRelations = relations(guild, ({ many }) => ({
  channels: many(channel),
}));

export const channel = pgTable(
  'channel',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channelId: text('channel_id').unique().notNull(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guild.guildId, { onDelete: 'cascade' }),
    filters: jsonb('filters').$type<ChannelFilter[]>().default([]).notNull(),
    filterMode: text('filter_mode').default('any').notNull(),
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
  id: uuid('id').primaryKey().defaultRandom(),
  guildId: text('guild_id').unique().notNull(),
  paddleSubscriptionId: text('paddle_subscription_id').unique().notNull(),
  paddleCustomerId: text('paddle_customer_id').notNull(),
  subscriberDiscordUserId: text('subscriber_discord_user_id').notNull(),
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

export const paddleCustomer = pgTable('paddle_customer', {
  id: uuid('id').primaryKey().defaultRandom(),
  discordUserId: text('discord_user_id').unique().notNull(),
  paddleCustomerId: text('paddle_customer_id').unique().notNull(),
  email: text('email'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

export type Guild = typeof guild.$inferSelect;
export type Channel = typeof channel.$inferSelect;
export type Subscription = typeof subscription.$inferSelect;
export type NewSubscription = typeof subscription.$inferInsert;
export type PaddleCustomer = typeof paddleCustomer.$inferSelect;
export type NewPaddleCustomer = typeof paddleCustomer.$inferInsert;
