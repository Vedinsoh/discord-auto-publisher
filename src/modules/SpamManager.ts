import fs from 'fs';
import { Guild, GuildChannel } from 'discord.js-light';
import PQueue from 'p-queue';
import client from '#client';
import getGuild from '#functions/getGuild';
import { channelToString, guildToString } from '#util/stringFormatters';
import logger from '#util/logger';
import { BlacklistActions, SpamChannelsMap } from '#types/BlacklistTypes';
import { spam } from '#config';
import blacklistFile from '#blacklist';

const writeQueue = new PQueue({ concurrency: 1 });
const blacklist = blacklistFile as string[];
const spamChannels: SpamChannelsMap = new Map();

const logRateLimited = (channel: GuildChannel, count: number) => {
  logger.info(`Channel ${channelToString(channel)} is being rate limited: ${count}/${spam.messagesHourlyLimit}`);
};

export default class SpamManager {
  constructor() {
    throw new Error(`The ${this.constructor.name} class may not be instantiated.`);
  }

  static startupCheck() {
    logger.debug('Checking for blacklisted guilds.');
    blacklist.forEach(async (guildId) => {
      const guild = await getGuild(guildId);
      if (guild) this.leaveGuild(guild);
    });
  }

  static isBlacklisted(guild: Guild, options = { leave: false }): boolean {
    if (!blacklist.includes(guild.id)) return false;
    if (options.leave) this.leaveGuild(guild);
    return true;
  }

  static leaveGuild(guild: Guild) {
    guild
      .leave()
      .then(() => logger.info(`Leaving blacklisted guild ${guildToString(guild)}`))
      .catch((error) => logger.error(error));
  }

  static registerSpamChannel(channel: GuildChannel, timeout: number) {
    const spamChannel = spamChannels.get(channel.id);
    if (spamChannel) return spamChannel.count++;

    spamChannels.set(channel.id, { count: 1, remaining: timeout });
    logRateLimited(channel, 11);

    setTimeout(() => {
      spamChannels.delete(channel.id);
      logger.debug(`Rate limit counter reset for ${channelToString(channel)}`);
    }, timeout);
  }

  static isSpamRegistered(channel: GuildChannel): boolean | void {
    const spamChannel = spamChannels.get(channel.id);
    if (!spamChannel || !spam.monitoringEnabled) return false;

    spamChannel.count++;
    if (spamChannel.count >= spam.messagesHourlyLimit - 10) {
      logger.info(
        `${channelToString(channel)} in ${guildToString(channel.guild)} hit the hourly spam limit (${
          spam.messagesHourlyLimit
        }).`
      );
      const { guild } = channel;
      spamChannels.delete(channel.id);
      this.blacklistUpdate(BlacklistActions.ADD, guild.id);
      return true;
    }

    logRateLimited(channel, spamChannel.count);
    return true;
  }

  // TODO
  static async blacklistUpdate(action: BlacklistActions, guildId: string): Promise<string> {
    return await writeQueue.add(() => this.blacklistUpdateJSON(action, guildId));
  }

  // TODO
  static async blacklistUpdateJSON(action: BlacklistActions, guildId: string): Promise<string> {
    const blacklistFile = './serversBlacklist.json';
    return new Promise((reply) => {
      if (guildId !== undefined && !guildId.match(/^\d{18}$/)) {
        return reply('Invalid server ID provided.');
      }

      fs.readFile(blacklistFile, (error, data) => {
        const list = JSON.parse(String(data));
        const arrays = [blacklist, list];

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
