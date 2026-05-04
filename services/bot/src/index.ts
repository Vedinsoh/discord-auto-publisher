import { ClusterManager } from '#structures/ClusterManager';
import { env } from '#utils/config';
import { logger } from '#utils/logger';

process.on('uncaughtException', (err) => {
  logger.error({ event: 'process.uncaughtException', err }, 'Uncaught exception');
});
process.on('unhandledRejection', (reason) => {
  logger.error({ event: 'process.unhandledRejection', err: reason }, 'Unhandled rejection');
});

const manager = new ClusterManager({
  totalShards: env.BOT_SHARDS,
  shardsPerClusters: env.BOT_SHARDS_PER_CLUSTER,
  token: env.DISCORD_TOKEN,
  mode: 'worker',
});

manager.start();
