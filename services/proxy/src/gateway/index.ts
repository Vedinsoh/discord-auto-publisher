import type { REST } from '@discordjs/rest';
import express, { type Router } from 'express';
import { type InvalidRequestsTracker, createInvalidRequestsTracker } from './invalidRequests.js';
import { createPassthroughHandler } from './passthrough.js';
import { createRest } from './rest.js';

export type GatewayStats = {
  globalRemaining: number;
  handlers: number;
  activeHandlers: number;
  hashes: number;
  invalidRequests: ReturnType<InvalidRequestsTracker['current']>;
};

export type Gateway = {
  rest: REST;
  router: Router;
  invalidRequests: InvalidRequestsTracker;
  stats(): GatewayStats;
};

export const buildGateway = (opts: { token: string; invalidRequestsThreshold: number }): Gateway => {
  const rest = createRest(opts.token);
  const invalidRequests = createInvalidRequestsTracker(rest, opts.invalidRequestsThreshold);

  const router = express.Router();
  router.all('/api/*splat', createPassthroughHandler(rest));

  return {
    rest,
    router,
    invalidRequests,
    stats: () => ({
      globalRemaining: rest.globalRemaining,
      handlers: rest.handlers.size,
      activeHandlers: rest.handlers.filter((h) => !h.inactive).size,
      hashes: rest.hashes.size,
      invalidRequests: invalidRequests.current(),
    }),
  };
};
