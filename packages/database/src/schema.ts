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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

export const guildRelations = relations(guild, ({ many, one }) => ({
  channels: many(channel),
  subscription: one(subscription),
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

export const subscription = pgTable('subscription', {
  id: uuid('id').primaryKey().defaultRandom(),
  guildId: text('guild_id')
    .unique()
    .notNull()
    .references(() => guild.guildId, { onDelete: 'cascade' }),
  paddleSubscriptionId: text('paddle_subscription_id').unique(),
  paddleCustomerId: text('paddle_customer_id'),
  subscriberDiscordUserId: text('subscriber_discord_user_id').notNull(),
  status: text('status').notNull().default('active'),
  paddleProductId: text('paddle_product_id'),
  paddlePriceId: text('paddle_price_id'),
  currentPeriodEndsAt: timestamp('current_period_ends_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  guild: one(guild, { fields: [subscription.guildId], references: [guild.guildId] }),
}));

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
