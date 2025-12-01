import { env } from 'lib/config/env.js';

export const PlanLimits = {
  ChannelsPerGuild: env.APP_EDITION === 'premium' ? 0 : 3,
};
