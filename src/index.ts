import dotenv from 'dotenv';
import path from 'path';
import { AutoPublisher } from '#structures/ClusterManager';

dotenv.config({
  path: path.resolve(process.cwd(), `.env.${process.env.NODE_ENV}`),
})

const manager = new AutoPublisher({
  totalShards: 'auto',
  token: process.env.BOT_TOKEN,
});

manager.start();
