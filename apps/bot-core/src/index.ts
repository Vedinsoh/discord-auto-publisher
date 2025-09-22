import 'utils/process.js';
import { env } from 'lib/config/env.js';
import { ClusterManager } from 'lib/structures/clusterManager.js';

const manager = new ClusterManager({
  totalShards: env.BOT_SHARDS,
  shardsPerClusters: env.BOT_SHARDS_PER_CLUSTER,
  token: env.DISCORD_TOKEN,
  mode: 'worker',
});

manager.start();
