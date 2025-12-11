import { env } from '@ap/config';
import { ClusterManager } from 'lib/structures/clusterManager.js';
import { logger } from 'utils/logger.js';

const manager = new ClusterManager({
  totalShards: env.BOT_SHARDS,
  shardsPerClusters: env.BOT_SHARDS_PER_CLUSTER,
  token: env.DISCORD_TOKEN,
  mode: 'worker',
});

manager.start();

process.on('unhandledRejection', ({ stack }: Error) => logger.error(stack));
