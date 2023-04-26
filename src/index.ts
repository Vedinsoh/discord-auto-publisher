import config from '#config';
import AutoPublisher from '#structures/ClusterManager';

const manager = new AutoPublisher({
  totalShards: 'auto',
  token: config.botToken,
});

manager.start();
