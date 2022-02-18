import { ClusterManagerMode, keepAliveOptions, Manager } from 'discord-hybrid-sharding';
import { AutoPublisherClient } from '#structures/Client';
import { getFiles } from '#util/fileUtils';
import { minToMs, secToMs } from '#util/timeConverters';
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
    this.spawn({ timeout: secToMs(15) }).then(() => {
      logger.info('Clustering complete!');
      setTimeout(() => {
        this.broadcastEval((client: AutoPublisherClient) => {
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
