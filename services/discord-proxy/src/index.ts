import process from 'node:process';
import { env } from './config.js';
import { createCantPostCache, createSublimitCounter } from './crosspost/caches.js';
import { createGate } from './crosspost/gate.js';
import { createCrosspostQueue } from './crosspost/queue.js';
import { buildGateway } from './gateway/index.js';
import { createApp } from './http/app.js';
import { logger } from './logger.js';
import { createRedisClient, disconnectAllRedis } from './redis/index.js';

const SUBLIMIT_REDIS_DB = 0;
const CANT_POST_REDIS_DB = 2;
const CF_BUDGET_THRESHOLD = 5_000;
const WORKER_CONCURRENCY = 50;

const main = async () => {
  const [sublimitRedis, cantPostRedis] = await Promise.all([
    createRedisClient(SUBLIMIT_REDIS_DB),
    createRedisClient(CANT_POST_REDIS_DB),
  ]);

  const sublimit = createSublimitCounter(sublimitRedis);
  const cantPost = createCantPostCache(cantPostRedis);
  const caches = { sublimit, cantPost };

  const gateway = buildGateway({ token: env.DISCORD_TOKEN, cfThreshold: CF_BUDGET_THRESHOLD });
  const gate = createGate({ cfBudget: gateway.cfBudget, cantPost, sublimit });
  const crosspost = createCrosspostQueue({
    rest: gateway.rest,
    gate,
    caches,
    redisUri: env.REDIS_URI,
    concurrency: WORKER_CONCURRENCY,
  });

  const app = createApp({ gateway, crosspost, caches });
  const server = app.listen(env.PORT, () => {
    logger.info({ event: 'proxy.listening', port: env.PORT }, `Discord proxy listening on port ${env.PORT}`);
  });

  const shutdown = async () => {
    logger.info({ event: 'proxy.shutdown' });
    server.close();
    await crosspost.shutdown();
    await disconnectAllRedis();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

main().catch((error) => {
  logger.error({ event: 'proxy.fatal', err: error });
  process.exit(1);
});
