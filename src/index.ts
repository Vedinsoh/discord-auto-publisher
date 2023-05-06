import config from '#config';
import AutoPublisher from '#structures/ClusterManager';

const manager = new AutoPublisher({
  totalShards: config.shards,
  shardsPerClusters: config.shardsPerCluster,
  token: config.botToken,
});

manager.start();
