import { Client, ClientEvents, ClientOptions, Collection } from 'discord.js-light';
import { AutoPublisherCluster } from '#structures/Cluster';
import { Event } from '#structures/Event';
import { Command } from '#structures/Command';
import { CommandsCollection } from '#types/CommandTypes';
import { getFiles, importFile } from '#util/fileUtils';
// import logger from '#util/logger';
// import { intervals } from '#config';

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
      if (!command.name) return;
      this.commands.set(command.name, command.run);
    });
  }

  // TODO
  /*
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
  */
}
