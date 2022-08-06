import { getFiles } from '#util/fileUtils';
import logger from '#util/logger';
import { minToMs } from '#util/timeConverters';
import { Manager, ManagerOptions } from 'discord-hybrid-sharding';

export class AutoPublisher extends Manager {
  constructor(options?: ManagerOptions) {
    const clientFile = getFiles('AutoPublisher{.ts,.js}')[0];
    super(clientFile, options);
  }

  start() {
    this.registerEvents();
    this.spawn({ timeout: -1 }).then(() => {
      logger.info('Clustering complete!');
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

  async registerEvents() {
    this.on('clusterCreate', ({ id }) => logger.debug(`[Cluster #${id}] Created`));
    this.on('debug', (value) => logger.debug(value));
  }
}

process.on('unhandledRejection', ({ stack }: Error) => logger.error(stack));
