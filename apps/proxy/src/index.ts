import process from 'node:process';
import { createAlerter } from '@ap/alerts';
import { assertRequiredEnv, config, env } from '@ap/config';
import { createRedisClient, DatabaseIDs, disconnectAllRedis, ProxyDatabaseIDs } from '@ap/redis';
import { createBlockedCache, createSublimitCounter } from './crosspost/caches.js';
import { createGate } from './crosspost/gate.js';
import { createCrosspostQueue } from './crosspost/queue.js';
import { buildGateway } from './gateway/index.js';
import { createApp } from './http/app.js';
import { logger } from './logger.js';

const INVALID_REQUESTS_THRESHOLD = 5_000;
const WORKER_CONCURRENCY = 50;
const PROXY_PORT = 8080;

const main = async () => {
  assertRequiredEnv();

  // Per-edition logical DBs in the shared Redis instance. Keyed on
  // `config.edition`, not `APP_EDITION`: a self-hosted instance pins the
  // edition to `premium` regardless of that variable, and the proxy must land
  // on the same triple its own bot's edition implies.
  const databases = ProxyDatabaseIDs[config.edition];

  const [sublimitRedis, blockedRedis, alertsRedis] = await Promise.all([
    createRedisClient(databases.sublimitCounter, logger),
    createRedisClient(databases.blockedChannels, logger),
    createRedisClient(DatabaseIDs.Alerts, logger),
  ]);

  const sublimit = createSublimitCounter(sublimitRedis);
  const blocked = createBlockedCache(blockedRedis);
  const caches = { sublimit, blocked };
  const alerter = createAlerter({
    redis: alertsRedis,
    service: 'proxy',
    edition: config.edition,
    logger,
  });

  const gateway = buildGateway({
    token: config.discordToken,
    invalidRequestsThreshold: INVALID_REQUESTS_THRESHOLD,
  });
  const gate = createGate({ invalidRequests: gateway.invalidRequests, blocked, sublimit, alerter });
  const crosspost = createCrosspostQueue({
    rest: gateway.rest,
    gate,
    caches,
    redisUri: env.REDIS_URI,
    queueDatabaseId: databases.crosspostQueue,
    concurrency: WORKER_CONCURRENCY,
  });

  const app = createApp({ gateway, crosspost, caches });
  const server = app.listen(PROXY_PORT, () => {
    logger.info(
      { event: 'proxy.listening', port: PROXY_PORT },
      `Discord proxy listening on port ${PROXY_PORT}`
    );
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

main().catch(error => {
  logger.error({ event: 'proxy.fatal', err: error });
  process.exit(1);
});
