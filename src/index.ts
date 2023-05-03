import config from '#config';
import AutoPublisher from '#structures/ClusterManager';

const manager = new AutoPublisher({
  totalShards: 12,
  token: config.botToken,
});

manager.start();
