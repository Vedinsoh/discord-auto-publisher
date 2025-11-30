import { env } from 'lib/config/env.js';

const PlanLimits = {
  ChannelsPerGuild: env.APP_EDITION === 'premium' ? 0 : 3, // 0 = unlimited, 3 = free plan limit
};

export const App = {
  PlanLimits,
};
