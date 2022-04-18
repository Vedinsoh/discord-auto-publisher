import { Manager, ManagerOptions } from 'discord-hybrid-sharding';
import { getFiles } from '#util/fileUtils';
import { minToMs } from '#util/timeConverters';
import logger from '#util/logger';

export class AutoPublisher extends Manager {
  constructor(options?: ManagerOptions) {
    super(getFiles('../AutoPublisher{.ts,.js}')[0], options);
  }

  start() {
    this.registerEvents();
    this.spawn({ timeout: -1 }).then(() => {
      logger.info('Clustering complete!');
      setTimeout(() => {
        this.broadcastEval((c) => {
          /* eslint-disable @typescript-eslint/ban-ts-comment */
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
