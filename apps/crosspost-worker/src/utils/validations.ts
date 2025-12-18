import { Validations } from '@ap/validations';
import { z } from 'zod';

// MIGRATION: Added guildId to body
// TODO: After migration (6 months), remove body validation
export const EnqueueReqSchema = z.object({
  params: z.object({
    channelId: Validations.snowflakeId,
    messageId: Validations.snowflakeId,
  }),
  body: z.object({
    guildId: Validations.snowflakeId,
  }),
});
