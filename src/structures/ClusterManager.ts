import { ClusterManagerMode, keepAliveOptions, Manager } from 'discord-hybrid-sharding';
import getFiles from '#functions/getFiles';
import logger from '#util/logger';

export class AutoPublisher extends Manager {
  constructor(options?: {
    totalShards?: number | 'auto';
    totalClusters?: number | 'auto';
    shardsPerClusters?: number;
    shardList?: 'auto' | number[];
    mode?: ClusterManagerMode;
    respawn?: boolean;
    shardArgs?: string[];
    token?: string;
    execArgv?: string[];
    keepAlive?: keepAliveOptions;
  }) {
    super(getFiles('../AutoPublisher{.ts,.js}')[0], options);
  }

  start() {
    this.registerEvents();
    this.spawn({ timeout: -1 });
  }

  async registerEvents() {
    this.on('clusterCreate', ({ id }) => logger.info(`Created cluster #${id}`));
    this.on('debug', (value) => logger.debug(value));
  }
}

process.on('unhandledRejection', (error: Error) => logger.error(error.stack));
