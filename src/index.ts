import '#config';
import AutoPublisher from '#structures/ClusterManager';

const manager = new AutoPublisher({
  totalShards: 'auto',
  shardsPerClusters: 2,
  token: process.env.BOT_TOKEN,
});

manager.start();
