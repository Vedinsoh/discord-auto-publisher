import {
  ClusterManager as BaseClusterManager,
  type ClusterManagerOptions,
} from 'discord-hybrid-sharding';
import { logger } from 'utils/logger.js';

export class ClusterManager extends BaseClusterManager {
  constructor(options: ClusterManagerOptions) {
    super('src/shard.ts', options);
  }

  /**
   * Start the cluster manager
   */
  public start() {
    this.registerEvents();
    this.registerListeners();
    this.spawn({ timeout: -1 }).then(() => {
      logger.info('Clustering complete!');
    });
  }

  /**
   * Register cluster listeners
   */
  private registerListeners() {
    this.on('clusterCreate', cluster => logger.info(`[Cluster #${cluster.id}] Created!`));
  }

  /**
   * Register cluster events
   */
  private registerEvents() {
    this.on('debug', value => logger.debug(value));
  }
}
