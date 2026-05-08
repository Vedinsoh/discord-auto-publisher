import type { REST } from '@discordjs/rest';
import express, { type Router } from 'express';
import { type CfBudget, createCfBudget } from './cfBudget.js';
import { createPassthroughHandler } from './passthrough.js';
import { createRest } from './rest.js';

export type GatewayStats = {
  globalRemaining: number;
  handlers: number;
  activeHandlers: number;
  hashes: number;
  cfBudget: ReturnType<CfBudget['current']>;
};

export type Gateway = {
  rest: REST;
  router: Router;
  cfBudget: CfBudget;
  stats(): GatewayStats;
};

export const buildGateway = (opts: { token: string; cfThreshold: number }): Gateway => {
  const rest = createRest(opts.token);
  const cfBudget = createCfBudget(rest, opts.cfThreshold);

  const router = express.Router();
  router.all('/api/*splat', createPassthroughHandler(rest));

  return {
    rest,
    router,
    cfBudget,
    stats: () => ({
      globalRemaining: rest.globalRemaining,
      handlers: rest.handlers.size,
      activeHandlers: rest.handlers.filter((h) => !h.inactive).size,
      hashes: rest.hashes.size,
      cfBudget: cfBudget.current(),
    }),
  };
};
