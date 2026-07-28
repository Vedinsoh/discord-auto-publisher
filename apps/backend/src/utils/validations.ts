import {
  CreateFilterSchema,
  FilterMatchModeSchema,
  SetChannelFiltersSchema,
  Validations,
} from '@ap/validations';
import { z } from 'zod';

export const ChannelReqSchema = z.object({
  params: z.object({
    channelId: Validations.snowflakeId,
  }),
});

export const ChannelEnableReqSchema = z.object({
  params: z.object({
    channelId: Validations.snowflakeId,
  }),
  body: z.object({
    guildId: Validations.snowflakeId,
  }),
});

export const EditionSchema = z.enum(['free', 'premium']);

export const GuildReqSchema = z.object({
  params: z.object({
    guildId: Validations.snowflakeId,
  }),
});

/** Bot presence removal (guildDelete): the leaving bot's edition */
export const GuildDeleteReqSchema = z.object({
  params: z.object({
    guildId: Validations.snowflakeId,
  }),
  body: z.object({
    edition: EditionSchema,
  }),
});

export const GuildRegisterReqSchema = z.object({
  params: z.object({
    guildId: Validations.snowflakeId,
  }),
  body: z.object({
    // The joining bot's edition
    edition: EditionSchema,
    // Live announcement channels from the GUILD_CREATE payload; absent = no prune.
    // 500 = Discord's per-guild channel cap
    announcementChannelIds: z.array(Validations.snowflakeId).max(500).optional(),
  }),
});

/** Bot-pushed publish-state batch (ADR 0008): one edition's per-channel capability */
export const PublishStatePushReqSchema = z.object({
  params: z.object({
    guildId: Validations.snowflakeId,
  }),
  body: z.object({
    edition: EditionSchema,
    // A full sweep (bot reconnect) replaces the edition's stale fields; an
    // incremental push (single permission event) only upserts.
    full: z.boolean().optional(),
    // 500 = Discord's per-guild channel cap
    channels: z
      .array(
        z.object({
          channelId: Validations.snowflakeId,
          canPublish: z.boolean(),
          missing: z.array(z.string()).max(16),
        })
      )
      .max(500),
  }),
});

export const GuildChannelReqSchema = z.object({
  params: z.object({
    guildId: Validations.snowflakeId,
    channelId: Validations.snowflakeId,
  }),
});

// MIGRATION: Remove after migration period (6 months)
export const GuildMigrateReqSchema = z.object({
  params: z.object({
    guildId: Validations.snowflakeId,
  }),
  body: z.object({
    // 500 = Discord's per-guild channel cap; the plan limit is enforced in Guilds.migrate
    channelIds: z.array(Validations.snowflakeId).max(500),
  }),
});

export const SubscriptionCheckoutReqSchema = z.object({
  params: z.object({
    guildId: Validations.snowflakeId,
  }),
  body: z.object({
    interval: z.enum(['month', 'year']),
  }),
});

export const FilterReqSchema = z.object({
  params: z.object({
    channelId: Validations.snowflakeId,
  }),
});

export const AddFilterReqSchema = z.object({
  params: z.object({
    channelId: Validations.snowflakeId,
  }),
  body: CreateFilterSchema,
});

export const RemoveFilterReqSchema = z.object({
  params: z.object({
    channelId: Validations.snowflakeId,
    filterId: z.string(),
  }),
});

export const UpdateFilterReqSchema = z.object({
  params: z.object({
    channelId: Validations.snowflakeId,
    filterId: z.string(),
  }),
  body: CreateFilterSchema,
});

export const SetFilterModeReqSchema = z.object({
  params: z.object({
    channelId: Validations.snowflakeId,
  }),
  body: z.object({
    mode: FilterMatchModeSchema,
  }),
});

// Guild-scoped rule replacement for the authenticated dashboard API. Unlike the
// internal channel routes above, this carries guildId so the handler can verify
// the channel belongs to the requester's guild before mutating filters. The
// dashboard inline builder saves the whole rule atomically.
export const GuildSetChannelFiltersReqSchema = z.object({
  params: z.object({
    guildId: Validations.snowflakeId,
    channelId: Validations.snowflakeId,
  }),
  body: SetChannelFiltersSchema,
});
