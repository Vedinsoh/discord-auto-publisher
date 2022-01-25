import 'dotenv/config';
import { AutoPublisher } from '#structures/ClusterManager';

const manager = new AutoPublisher({
  totalShards: 2, // TODO
  // totalShards: 'auto',
  token: process.env.BOT_TOKEN,
});

manager.start();

export default manager;
