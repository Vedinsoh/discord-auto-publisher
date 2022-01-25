import { Guild, GuildChannel } from 'discord.js-light';
import PQueue from 'p-queue';
import client from '#client';
import getGuild from '#functions/getGuild';
import { channelToString, guildToString } from '#util/stringFormatters';
import { hourToMs } from '#util/timeConverters';
import logger from '#util/logger';
import { BlacklistActions, SpamChannelsMap, SpamGuildsMap } from '#types/BlacklistTypes';
import { spam } from '#config';
import blacklistFile from '#blacklist';

const writeQueue = new PQueue({ concurrency: 1 });
const blacklist = blacklistFile as string[];
const spamChannels: SpamChannelsMap = new Map();
const spamGuilds: SpamGuildsMap = new Map();

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

  // TODO
  static cacheAudit() {
    logger.debug('Auditing spam channels in cache.');
    spamGuilds.forEach((value, key) => {
      if (Date.now() - value.reportTimestamp >= hourToMs(spam.cacheExpirationHours)) {
        spamGuilds.delete(key);
      }
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
      .then(() => logger.info(`Blacklisted guild: ${guildToString(guild)}. Leaving.`))
      .catch((error) => logger.error(error));
  }

  static registerSpamChannel(channel: GuildChannel, timeout: number) {
    const spamChannel = spamChannels.get(channel.id);
    if (spamChannel) return spamChannel.count++;

    spamChannels.set(channel.id, { count: 1, remaining: timeout });
    logger.info(
      `Channel ${channelToString(channel)} is being rate limited: 11/${
        spam.messagesHourlyLimit
      }`
    );

    setTimeout(() => {
      spamChannels.delete(channel.id);
      logger.debug(`Rate limit counter reset for ${channelToString(channel)}`);
    }, timeout);
  }

  // TODO
  static rateLimitCheck(channel: GuildChannel) {
    const channelId = channel.id;
    const guildId = channel.guild.id;
    const now = Date.now();

    if (spamChannels.has(channelId)) {
      if (!spam.monitoringEnabled) return true;

      const spamChannel = spamChannels.get(channelId);
      spamChannel.count++;

      if (spamChannel.count >= spam.messagesHourlyLimit - 10) {
        logger.info(
          `${channelToString(channel)} in ${guildToString(channel.guild)} hit the hourly spam limit (${
            spam.messagesHourlyLimit
          }).`
        );
        // this.blacklistUpdate('add', guildId); TODO
        spamChannels.delete(channelId);
        if (spamGuilds.has(guildId)) spamGuilds.delete(guildId);
        return true;
      }

      // Util.errorHandler(channel, 'rateLimited', spamChannel.count);

      const flagged = () => {
        logger.info(
          `${guildToString(channel.guild)} spam flag in ${channelToString(channel)} (${
            spamGuilds.get(guildId).channels.size
          }/${spam.spamChannelsThreshold}).`
        );
      };

      if (spamChannel.count >= Math.floor((spam.messagesHourlyLimit - 10) * (2 / 3))) {
        if (spamGuilds.has(guildId)) {
          const spamGuild = spamGuilds.get(guildId);

          if (spamGuild.channels.has(channelId)) {
            if (now - spamGuild.channels.get(channelId) >= spamChannel.remaining) {
              spamGuild.channels.set(channelId, now);
              spamGuild.count++;
              flagged();
            }
          } else {
            spamGuild.channels.set(channelId, now);
            spamGuild.count++;
            flagged();
          }

          if (spamGuild.count >= spam.spamChannelsThreshold) {
            logger.info(
              `${guildToString(channel.guild)} hit the channels spam threshold (${spam.spamChannelsThreshold}).`
            );
            // this.blacklistUpdate('add', guildId); TODO
            spamGuilds.delete(guildId);
          }
        } else {
          spamGuilds.set(guildId, {
            count: 1,
            channels: new Map([[channelId, now]]),
            reportTimestamp: now,
          });
          flagged();
        }
      }
      return true;
    } else {
      return false;
    }
  }

  /*
  static async blacklistUpdate(action: BlacklistActions, guildId: string): Promise<string> {
    return await writeQueue.add(() => this.blacklistUpdateJSON(action, guildId));
  }

  static async blacklistUpdateJSON(action: BlacklistActions, guildId: string): Promise<string> {
    const blacklistFile = './serversBlacklist.json';
    return new Promise(reply => {
      if (guildId !== undefined &&
				!guildId.match(/^\d{18}$/)) {
        return reply('Invalid server ID provided.');
      }

      fs.readFile(blacklistFile, (error, data) => {
        const list = JSON.parse(data);
        const arrays = [blacklist, list];

        switch (action) {
        case 'add':
          if (!list.includes(guildId)) {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
              for (const array of arrays) array.push(guildId);
              this.leaveGuild(guild);
            }
            else { return reply('Invalid server ID provided.'); }
          }
          else { return reply(`${guildId} is already blacklisted.`); }
          break;
        case 'remove':
          if (list.includes(guildId)) {
            for (const array of arrays) {
              array.indexOf(guildId) > -1
                ? array.splice(array.indexOf(guildId), 1)
                : false;
            }
            break;
          }
          else { return reply(`${guildId} is not blacklisted.`); }
        }

        fs.writeFile(blacklistFile, JSON.stringify(list, null, 4), err => {
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
  */
}
