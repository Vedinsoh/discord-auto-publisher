import { ActivityType, Client, ClientEvents, Collection } from 'discord.js';
import type { Level as LoggerLevel } from 'pino';
import config from '#config';
import AntiSpamManager from '#managers/AntiSpamManager';
import BlacklistManager from '#managers/BlacklistManager';
import QueueManager from '#managers/QueueManager';
import RateLimitsManager from '#managers/RateLimitsManager';
import AutoPublisherCluster from '#structures/Cluster';
import type Event from '#structures/Event';
import type { CommandsCollection } from '#types/AdminCommandTypes';
import { getFiles, importFile } from '#util/fileUtils';
import logger from '#util/logger';
import { minToMs } from '#util/timeConverters';

const { presenceInterval } = config;

class AutoPublisherClient extends Client {
  public cluster = new AutoPublisherCluster(this);
  public commands: CommandsCollection = new Collection();

  public blacklist = new BlacklistManager();
  public rateLimits = new RateLimitsManager();
  public antiSpam = new AntiSpamManager();
  public crosspostQueue = new QueueManager();

  public async start() {
    return Promise.all([
      this.blacklist.connect(),
      this.rateLimits.connect(),
      this.antiSpam.connect(),

      this._registerEvents(),
      this._registerCommands(),
      this.login(process.env.BOT_TOKEN),
    ]).catch((error) => {
      logger.error(error);
      process.exit(1);
    });
  }

  private async _registerEvents() {
    const filePaths = getFiles('listeners/**/*.js');
    filePaths.forEach(async (filePath) => {
      const event: Event<keyof ClientEvents> = await importFile(filePath);
      this.on(event.name, event.run);
    });
  }

  private async _registerCommands() {
    const filePaths = getFiles('util/admin-commands/*.js');
    filePaths.forEach(async (filePath) => {
      const command = await importFile(filePath);
      this.commands.set(command.name, command.run);
    });
  }

  public startPresenceInterval() {
    setInterval(() => this.updatePresence(), minToMs(presenceInterval));
  }

  public async updatePresence() {
    const guilds = (await this.cluster.fetchClientValues('guilds.cache.size')) //
      .reduce((p: number, n: number) => p + n);
    logger.debug(`[CLUSTER ${this.cluster.id}] Updating presence. Guilds: ${guilds}`);

    this.user?.setPresence({
      activities: [
        {
          name: `${guilds} server${guilds > 1 ? 's' : ''}`,
          type: ActivityType.Watching,
        },
      ],
    });
  }

  public setLoggerLevel(level: LoggerLevel) {
    logger.level = level;
  }
}

export default AutoPublisherClient;
