import { Validations } from '@ap/validations';
import { z } from 'zod';

export const EnqueueReqSchema = z.object({
  params: z.object({
    channelId: Validations.snowflakeId,
    messageId: Validations.snowflakeId,
  }),
});
