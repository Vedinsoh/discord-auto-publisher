import { Client, type ClientEvents, Collection } from 'discord.js';
import type { Level as LoggerLevel } from 'pino';
import AutoPublisherCluster from '#structures/Cluster';
import type Event from '#structures/Event';
import type { CommandsCollection } from '#types/AdminCommandTypes';
import { env } from '#utils/config';
import { getFilePaths, importFile } from '#utils/fileUtils';

export class BotClient extends Client {
  public cluster = new AutoPublisherCluster(this);
  public commands: CommandsCollection = new Collection();

  public logger = this.cluster.logger;

  public async start() {
    return Promise.all([this._registerEvents(), this._registerCommands(), this.login(env.DISCORD_TOKEN)]).catch(
      (error) => {
        this.logger.error(error);
        process.exit(1);
      }
    );
  }

  private async _registerEvents() {
    const filePaths = getFilePaths('listeners/**/*.js');
    return filePaths.map(async (filePath) => {
      const event: Event<keyof ClientEvents> = await importFile(filePath);
      this.on(event.name, event.run);
    });
  }

  private async _registerCommands() {
    const filePaths = getFilePaths('utils/admin-commands/*.js');
    return filePaths.map(async (filePath) => {
      const command = await importFile(filePath);
      this.commands.set(command.name, command.run);
    });
  }

  public setLoggerLevel(level: LoggerLevel) {
    this.logger.level = level;
  }
}
