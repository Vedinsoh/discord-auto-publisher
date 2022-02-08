// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ClusterManagerMode, keepAliveOptions, Manager } from 'discord-hybrid-sharding';
import { getFiles } from '#util/fileUtils';
import { secToMs } from '#util/timeConverters';
import logger from '#util/logger';

export class AutoPublisher extends Manager {
  // Inferred options from discord-hybrid-sharding's Manager constructor
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
    this.spawn().then(() => {
      setTimeout(() => {
        this.broadcastEval((client) => {
          client.updatePresence();
          client.startPresenceInterval();
        });
      }, secToMs(30));
    });
  }

  async registerEvents() {
    this.on('clusterCreate', ({ id }) => logger.debug(`[Cluster #${id}] Created`));
    this.on('debug', (value) => logger.debug(value));
  }
}

process.on('unhandledRejection', (error: Error) => logger.error(error.stack));
