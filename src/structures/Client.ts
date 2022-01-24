import { Client, ClientEvents, ClientOptions, Collection } from 'discord.js-light';
import Cluster from 'discord-hybrid-sharding';
import glob from 'glob';
import { promisify } from 'util';
import logger from '#util/logger';
import { Event } from '#structures/Event';
import { Command } from '#structures/Command';
import { CommandType } from '#types/CommandType';
import { intervals } from '#config';

const getFiles = promisify(glob);

export class AutoPublisher extends Client {
  cluster: Cluster.Client = new Cluster.Client(this);
  commands: Collection<string, CommandType> = new Collection();
  startedAt: number = Date.now();

  constructor(options: ClientOptions) {
    super(options);
  }

  start() {
    this.registerEvents();
    this.registerCommands();
    this.login(process.env.BOT_TOKEN);
    setInterval(() => this.updatePresence(), intervals.presence * 60 * 1000);
  }

  async importFile(filePath: string) {
    return (await import(filePath))?.default;
  }

  async registerEvents() {
    const filePaths: string[] = await getFiles(`${__dirname}/../events/*{.ts,.js}`);
    filePaths.forEach(async (filePath) => {
      const event: Event<keyof ClientEvents> = await this.importFile(filePath);
      this.on(event.name, event.run);
    });
  }

  async registerCommands() {
    const filePaths: string[] = await getFiles(`${__dirname}/../modules/owner_commands/*{.ts,.js}`);
    filePaths.forEach(async (filePath) => {
      const command: Command = await this.importFile(filePath);
      if (!command.name) return;
      this.commands.set(command.name, command.run);
    });
  }

  // TODO
  async updatePresence() {
    if (Cluster.data.TOTAL_SHARDS - 1 !== this.cluster.id) return;

    const guilds = await (
      await this.cluster.broadcastEval('this.guilds.cache.size')
    ).reduce((p: number, n: number) => p + n);

    logger.debug(`Updating presence. Guilds: ${guilds}`);
    this.cluster.broadcastEval((cluster) => {
      cluster.client.user?.setPresence({
        activities: [
          {
            name: `${guilds} server${guilds > 1 ? 's' : ''}`,
            type: 'WATCHING',
          },
        ],
      });
    });
  }
}

process.on('unhandledRejection', (error: Error) => logger.error(error.stack));
