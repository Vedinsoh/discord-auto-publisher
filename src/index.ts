import 'dotenv/config';
import { Manager } from 'discord-hybrid-sharding';
import { join, extname } from 'path';
import logger from '#util/logger';

const manager = new Manager(join(__dirname, `AutoPublisher${extname(__filename)}`), {
  totalShards: 2, // TODO
  // totalShards: 'auto',
  token: process.env.BOT_TOKEN,
});

manager.on('clusterCreate', (cluster) => logger.info(`Launched cluster #${cluster.id}`));
manager.spawn({ timeout: -1 });
