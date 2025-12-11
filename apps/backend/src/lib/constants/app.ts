import { env } from '@ap/config';

export const PlanLimits = {
  ChannelsPerGuild: env.APP_EDITION === 'premium' ? 0 : 3,
};
