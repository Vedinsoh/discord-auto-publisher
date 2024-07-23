import AutoPublisher from '#structures/ClusterManager';
import { env } from '#utils/config';

const manager = new AutoPublisher({
  totalShards: env.BOT_SHARDS,
  shardsPerClusters: env.BOT_SHARDS_PER_CLUSTER,
  token: env.DISCORD_TOKEN,
  mode: 'worker',
});

manager.start();
