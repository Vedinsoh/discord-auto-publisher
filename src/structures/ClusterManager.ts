import { ClusterManagerMode, keepAliveOptions, Manager } from 'discord-hybrid-sharding';
import { getFiles } from '#util/fileUtils';
import { secToMs } from '#util/timeConverters';
import logger from '#util/logger';
import { AutoPublisherClient } from '#structures/Client';

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
      logger.info('Clustering complete!');
      setTimeout(() => {
        // TODO This is a bug with type definitions in discord-hybrid-sharding library
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.broadcastEval((client: AutoPublisherClient) => {
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

process.on('unhandledRejection', ({ stack }: Error) => logger.error(stack));
