import { Manager as ClusterManager, ManagerOptions as ClusterManagerOptions } from 'discord-hybrid-sharding';
import client from '#client';
import { getFiles } from '#util/fileUtils';
import { minToMs } from '#util/timeConverters';

class AutoPublisher extends ClusterManager {
  constructor(options?: ClusterManagerOptions) {
    const clientFile = getFiles('AutoPublisher.js')[0];
    super(clientFile, options);
  }

  public start() {
    this._registerEvents();
    this.spawn({ timeout: -1 }).then(() => {
      client.logger.info('Clustering complete!');
      setTimeout(() => {
        /* eslint-disable @typescript-eslint/ban-ts-comment */
        this.broadcastEval((c) => {
          // @ts-ignore
          c.updatePresence();
          // @ts-ignore
          c.startPresenceInterval();
        });
      }, minToMs(1));
    });
  }

  private async _registerEvents() {
    this.on('clusterCreate', ({ id }) => client.logger.debug(`[Cluster ${id}] Created`));
    this.on('debug', (value) => client.logger.debug(value));
  }
}

process.on('unhandledRejection', ({ stack }: Error) => client.logger.error(stack));

export default AutoPublisher;
