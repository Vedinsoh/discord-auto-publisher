import fs from 'fs';
// import PQueue from 'p-queue';
import { Guild, GuildChannel } from 'discord.js-light';
import client from '#client';
import { spam } from '#config';
import { channelToString, guildToString } from '#util/stringFormatters';
import logger from '#util/logger';
// import debugLog from '../functions/debugLog';
import { BlacklistActions } from '#types/BlacklistTypes';
import blacklist from '../serversBlacklist.json';

const blacklistFile = './serversBlacklist.json',
  // blacklist = require(`.${blacklistFile}`),
  // blacklistQueue = new PQueue({ concurrency: 1 }),
  spamReportedGuilds = new Map(),
  hourlySpamLimit = new Map();

export default class SpamManager {
  constructor() {
    throw new Error(`The ${this.constructor.name} class may not be instantiated.`);
  }

  static startupCheck() {
    logger.debug('Checking for blacklisted guilds.');
    for (const id of blacklist) {
      const guild = client.guilds.cache.get(id);
      if (guild) this.leaveGuild(guild);
    }
  }

  // TODO
  static blacklistCheck(guild: Guild, options = { leave: false }): boolean {
    /*
    if (!guild) return false;
    if (blacklist.includes(guild.id)) {
      if (options.leave) this.leaveGuild(guild);
      return true;
    }
    if (blacklist.includes(typeof guild === 'object' ? guild.id :
      guild.match(/^\d{18}$/) ? guild : '')) {
      if (options.leave) this.leaveGuild(guild);
      return true;
    }
    */
    return false;
  }

  static leaveGuild(guild: Guild) {
    guild
      .leave()
      .then(() => logger.info(`Blacklisted guild: ${guildToString(guild)}. Leaving.`))
      .catch((error) => logger.error(error));
  }

  static cacheAudit() {
    logger.debug('Auditing the spam channels in cache.');
    spamReportedGuilds.forEach((value, key) => {
      if (Date.now() - value.reportTime >= 1000 * 60 * 60 * spam.cacheExpirationHours) {
        spamReportedGuilds.delete(key);
      }
    });
  }

  static addSpamChannel(channel: GuildChannel, timeout: number) {
    const channelId = channel.id;

    if (!hourlySpamLimit.has(channelId)) {
      hourlySpamLimit.set(channelId, { count: 1, remaining: timeout });

      // debugLog(channel, 'rateLimited', spam.monitoringEnabled ? hourlySpamLimit.get(channelId).count : false);

      setTimeout(() => {
        hourlySpamLimit.delete(channelId);
        logger.debug(`Rate limit counter reset for ${channelToString(channel)}`);
      }, timeout);
    } else {
      hourlySpamLimit.get(channelId).count++;
    }
  }

  static rateLimitCheck(channel: GuildChannel) {
    const channelId = channel.id;
    const guildId = channel.guild.id;
    const now = Date.now();

    if (hourlySpamLimit.has(channelId)) {
      if (!spam.monitoringEnabled) return true;

      const spamChannel = hourlySpamLimit.get(channelId);
      spamChannel.count++;

      if (spamChannel.count >= spam.messagesHourlyLimit - 10) {
        logger.info(
          `${channelToString(channel)} in ${guildToString(channel.guild)} hit the hourly spam limit (${
            spam.messagesHourlyLimit
          }).`
        );
        // this.blacklistUpdate('add', guildId); TODO
        hourlySpamLimit.delete(channelId);
        if (spamReportedGuilds.has(guildId)) spamReportedGuilds.delete(guildId);
        return true;
      }

      // Util.debugLog(channel, 'rateLimited', spamChannel.count);

      const flagged = () => {
        logger.info(
          `${guildToString(channel.guild)} spam flag in ${channelToString(channel)} (${
            spamReportedGuilds.get(guildId).channels.size
          }/${spam.spamChannelsThreshold}).`
        );
      };

      if (spamChannel.count >= Math.floor((spam.messagesHourlyLimit - 10) * (2 / 3))) {
        if (spamReportedGuilds.has(guildId)) {
          const spamGuild = spamReportedGuilds.get(guildId);

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
            spamReportedGuilds.delete(guildId);
          }
        } else {
          spamReportedGuilds.set(guildId, {
            count: 1,
            channels: new Map([[channelId, now]]),
            reportTime: now,
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
    return await blacklistQueue.add(() => this.blacklistUpdateJSON(action, guildId));
  }

  static async blacklistUpdateJSON(action: BlacklistActions, guildId: string): Promise<string> {
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
