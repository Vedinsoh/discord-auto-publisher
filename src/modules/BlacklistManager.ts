import fs from 'fs';
import PQueue from 'p-queue';
import { Guild } from 'discord.js-light';
import client from '#client';
import getGuild from '#functions/getGuild';
import { BlacklistActions } from '#types/BlacklistTypes';
import { guildToString } from '#util/stringFormatters';
import logger from '#util/logger';
import blacklistFile from '#blacklist';

export default class BlacklistManager {
  blacklist: string[] = blacklistFile;
  writeQueue = new PQueue({ concurrency: 1 });

  startupCheck() {
    logger.debug('Checking for blacklisted guilds.');
    this.blacklist.forEach(async (guildId) => {
      const guild = await getGuild(guildId);
      if (guild) this.leaveGuild(guild);
    });
  }

  isBlacklisted(guild: Guild, options = { leave: false }): boolean {
    if (this.blacklist.includes(guild.id)) {
      if (options.leave) this.leaveGuild(guild);
      return true;
    }
    return false;
  }

  leaveGuild(guild: Guild) {
    guild
      .leave()
      .then(() => logger.info(`Leaving blacklisted guild ${guildToString(guild)}`))
      .catch((error) => logger.error(error));
  }

  // TODO
  async update(action: BlacklistActions, guildId: string): Promise<string> {
    return await this.writeQueue.add(() => this.updateJSON(action, guildId));
  }

  // TODO
  async updateJSON(action: BlacklistActions, guildId: string): Promise<string> {
    const blacklistFile = './serversBlacklist.json';
    return new Promise((reply) => {
      if (guildId !== undefined && !guildId.match(/^\d{18}$/)) {
        return reply('Invalid server ID provided.');
      }

      fs.readFile(blacklistFile, (error, data) => {
        const list = JSON.parse(String(data));
        const arrays = [this.blacklist, list];

        switch (action) {
          case BlacklistActions.ADD:
            if (!list.includes(guildId)) {
              const guild = client.guilds.cache.get(guildId);
              if (guild) {
                for (const array of arrays) array.push(guildId);
                this.leaveGuild(guild);
              } else {
                return reply('Invalid server ID provided.');
              }
            } else {
              return reply(`${guildId} is already blacklisted.`);
            }
            break;
          case BlacklistActions.REMOVE:
            if (list.includes(guildId)) {
              for (const array of arrays) {
                array.indexOf(guildId) > -1 ? array.splice(array.indexOf(guildId), 1) : false;
              }
              break;
            } else {
              return reply(`${guildId} is not blacklisted.`);
            }
        }

        fs.writeFile(blacklistFile, JSON.stringify(list, null, 4), (err) => {
          if (err) {
            const object = JSON.stringify(err, null, 4);
            logger.error(object);
            return reply(`An error has occured:\n${object}`);
          }
          const response = `Blacklist ${action}: ${guildId}`;
          logger.info(response);
          return reply(response);
        });
      });
    });
  }
}
