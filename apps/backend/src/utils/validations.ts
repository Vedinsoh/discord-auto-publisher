import { CreateFilterSchema, FilterMatchModeSchema, Validations } from '@ap/validations';
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

export const GuildReqSchema = z.object({
  params: z.object({
    guildId: Validations.snowflakeId,
  }),
});

export const GuildRegisterReqSchema = z.object({
  params: z.object({
    guildId: Validations.snowflakeId,
  }),
  body: z.object({
    // Live announcement channels from the GUILD_CREATE payload; absent = no prune.
    // 500 = Discord's per-guild channel cap
    announcementChannelIds: z.array(Validations.snowflakeId).max(500).optional(),
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
