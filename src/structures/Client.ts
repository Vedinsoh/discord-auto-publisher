import { ActivityType, Client, type ClientEvents, Collection, RESTEvents } from 'discord.js';
import crypto from 'node:crypto';
import type { Level as LoggerLevel } from 'pino';
import config from '#config';
import AntiSpamManager from '#managers/AntiSpamManager';
import BlacklistManager from '#managers/BlacklistManager';
import CrosspostsManager from '#managers/CrosspostsManager';
import QueueManager from '#managers/QueueManager';
import RequestLimitManager from '#managers/RequestLimitManager';
import AutoPublisherCluster from '#structures/Cluster';
import type Event from '#structures/Event';
import type { CommandsCollection } from '#types/AdminCommandTypes';
import { getFilePaths, importFile } from '#util/fileUtils';
import { createLogger, logger } from '#util/logger';
import { is429, parseRestSublimit } from '#util/parseRestSublimit';
import { minToMs } from '#util/timeConverters';

class AutoPublisherClient extends Client {
  public cluster = new AutoPublisherCluster(this);
  public commands: CommandsCollection = new Collection();

  public logger = createLogger();
  public blacklist = new BlacklistManager();
  public antiSpam = new AntiSpamManager();
  public crosspostQueue = new QueueManager();
  public cache = {
    requestLimits: new RequestLimitManager(),
    crossposts: new CrosspostsManager(),
  };

  public async start() {
    this.logger = createLogger(`CLUSTER ${this.cluster.id}`);
    return Promise.all([
      this.blacklist.connect(),
      this.antiSpam.connect(),
      this.cache.requestLimits.connect(),
      this.cache.crossposts.connect(),
      this._registerEvents(),
      this._registerCommands(),
      this.login(config.botToken),
    ]).catch((error) => {
      logger.error(error);
      process.exit(1);
    });
  }

  private async _registerEvents() {
    this.rest.on(RESTEvents.Debug, (data) => {
      const rateLimited = is429(data);
      if (rateLimited) this.cache.requestLimits.add(crypto.randomUUID(), 429);

      const parsedParams = parseRestSublimit(data);
      if (parsedParams) this.antiSpam.add(parsedParams);
    });

    const filePaths = getFilePaths('listeners/**/*.js');
    return filePaths.map(async (filePath) => {
      const event: Event<keyof ClientEvents> = await importFile(filePath);
      this.on(event.name, event.run);
    });
  }

  private async _registerCommands() {
    const filePaths = getFilePaths('util/admin-commands/*.js');
    return filePaths.map(async (filePath) => {
      const command = await importFile(filePath);
      this.commands.set(command.name, command.run);
    });
  }

  public startPresenceInterval() {
    setInterval(() => this.updatePresence(), minToMs(config.presenceInterval));
  }

  public async updatePresence() {
    const guilds = (await this.cluster.fetchClientValues('guilds.cache.size')) //
      .reduce((p: number, n: number) => p + n);
    logger.debug(`Updating presence. Guilds: ${guilds}`);

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
