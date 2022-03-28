import { ClusterManagerMode, keepAliveOptions, Manager } from 'discord-hybrid-sharding';
import { getFiles } from '#util/fileUtils';
import { minToMs } from '#util/timeConverters';
import logger from '#util/logger';

export class AutoPublisher extends Manager {
  // Inferred options from discord-hybrid-sharding's Manager constructor
  /* eslint-disable @typescript-eslint/ban-types */
  constructor(options?: {
    totalShards?: number | 'auto';
    totalClusters?: number | 'auto';
    shardsPerClusters?: number;
    shardList?: 'auto' | number[][];
    mode?: ClusterManagerMode;
    respawn?: boolean;
    shardArgs?: string[];
    token?: string;
    execArgv?: string[];
    keepAlive?: keepAliveOptions;
    queue?: { auto?: boolean };
    clusterData?: Object;
    clusterOptions?: Object;
  }) {
    super(getFiles('../AutoPublisher{.ts,.js}')[0], options);
  }

  start() {
    this.registerEvents();
    this.spawn({ timeout: -1 }).then(() => {
      logger.info('Clustering complete!');
      setTimeout(() => {
        this.broadcastEval((client) => {
          client.updatePresence();
          client.startPresenceInterval();
        });
      }, minToMs(1));
    });
  }

  async registerEvents() {
    this.on('clusterCreate', ({ id }) => logger.debug(`[Cluster #${id}] Created`));
    this.on('debug', (value) => logger.debug(value));
  }
}

process.on('unhandledRejection', ({ stack }: Error) => logger.error(stack));
