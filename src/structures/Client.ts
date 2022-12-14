import { ActivityType, Client, ClientEvents, Collection } from 'discord.js';
import type { Level as LoggerLevel } from 'pino';
import config from '#config';
import BlacklistManager from '#managers/BlacklistManager';
import QueueManager from '#managers/QueueManager';
import RateLimitsManager from '#managers/RateLimitsManager';
import SpamManager from '#managers/SpamManager';
import AutoPublisherCluster from '#structures/Cluster';
import type Event from '#structures/Event';
import type { CommandsCollection } from '#types/AdminCommandTypes';
import { getFiles, importFile } from '#util/fileUtils';
import logger from '#util/logger';
import { minToMs } from '#util/timeConverters';

const { presenceInterval } = config;
class AutoPublisherClient extends Client {
  public cluster = new AutoPublisherCluster(this);
  public blacklist = new BlacklistManager();
  public rateLimits = new RateLimitsManager();
  public spam = new SpamManager();
  public crosspostQueue = new QueueManager();

  public commands: CommandsCollection = new Collection();
  public startedAt = Date.now();

  async start() {
    return Promise.all([
      this.blacklist.connect(),
      this.rateLimits.connect(),
      this.spam.connect(),

      this.registerEvents(),
      this.registerCommands(),
      this.login(process.env.BOT_TOKEN),
    ]).catch((error) => {
      logger.error(error);
      new Error('Failed to start the client. Please ensure your Redis server is running.');
      process.exit(1);
    });
  }

  async registerEvents() {
    const filePaths = getFiles('listeners/**/*.js');
    filePaths.forEach(async (filePath) => {
      const event: Event<keyof ClientEvents> = await importFile(filePath);
      this.on(event.name, event.run);
    });
  }

  async registerCommands() {
    const filePaths = getFiles('util/admin-commands/*.js');
    filePaths.forEach(async (filePath) => {
      const command = await importFile(filePath);
      this.commands.set(command.name, command.run);
    });
  }

  async startPresenceInterval() {
    setInterval(() => this.updatePresence(), minToMs(presenceInterval));
  }

  async updatePresence() {
    const guilds = (await this.cluster.fetchClientValues('guilds.cache.size')).reduce((p: number, n: number) => p + n);
    logger.debug(`[Cluster ${this.cluster.id}] Updating presence. Guilds: ${guilds}`);

    this.user?.setPresence({
      activities: [
        {
          name: `${guilds} server${guilds > 1 ? 's' : ''}`,
          type: ActivityType.Watching,
        },
      ],
    });
  }

  setLoggerLevel(level: LoggerLevel) {
    logger.level = level;
  }
}

export default AutoPublisherClient;
