import { CreateFilterSchema, FilterMatchMode, Validations } from '@ap/validations';
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
    mode: FilterMatchMode,
  }),
});
