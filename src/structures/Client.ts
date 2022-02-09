import { Client, ClientEvents, ClientOptions, Collection } from 'discord.js-light';
import { AutoPublisherCluster } from '#structures/Cluster';
import { Event } from '#structures/Event';
import { Command } from '#structures/Command';
import { CommandsCollection } from '#types/CommandTypes';
import { getFiles, importFile } from '#util/fileUtils';
import { minToMs } from '#util/timeConverters';
import logger from '#util/logger';
import { presenceInterval } from '#config';

export class AutoPublisherClient extends Client {
  cluster = new AutoPublisherCluster(this);
  commands: CommandsCollection = new Collection();
  startedAt = Date.now();

  constructor(options: ClientOptions) {
    super(options);
  }

  start() {
    this.registerEvents();
    this.registerCommands();
    this.login(process.env.BOT_TOKEN);
  }

  async registerEvents() {
    const filePaths: string[] = getFiles('../listeners/**/*{.ts,.js}');
    filePaths.forEach(async (filePath) => {
      const event: Event<keyof ClientEvents> = await importFile(filePath);
      this.on(event.name, event.run);
    });
  }

  async registerCommands() {
    const filePaths: string[] = getFiles('../modules/owner_commands/*{.ts,.js}');
    filePaths.forEach(async (filePath) => {
      const command: Command = await importFile(filePath);
      this.commands.set(command.name, command.run);
    });
  }

  async startPresenceInterval() {
    setInterval(() => this.updatePresence(), minToMs(presenceInterval));
  }

  async updatePresence() {
    const guilds = (await this.cluster.fetchClientValues('guilds.cache.size')).reduce((p: number, n: number) => p + n);
    logger.debug(`[Cluster #${this.cluster.id}] Updating presence. Guilds: ${guilds}`);

    this.user?.setPresence({
      activities: [
        {
          name: `${guilds} server${guilds > 1 ? 's' : ''}`,
          type: 'WATCHING',
        },
      ],
    });
  }

  setLoggerLevel(level: string) {
    logger.level = level;
  }
}
