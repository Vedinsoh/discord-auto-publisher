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

export type Guild = typeof guild.$inferSelect;
export type Channel = typeof channel.$inferSelect;
