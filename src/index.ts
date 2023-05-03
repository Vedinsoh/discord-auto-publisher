import config from '#config';
import AutoPublisher from '#structures/ClusterManager';

const manager = new AutoPublisher({
  totalShards: config.shards,
  token: config.botToken,
});

manager.start();
