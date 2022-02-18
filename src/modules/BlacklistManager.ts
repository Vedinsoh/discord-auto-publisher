import Josh from '@joshdb/core';
import provider from '@joshdb/json'; // TODO remove noImplicitAny from tsconfig
import { Snowflake } from 'discord.js-light';
import client from '#client';
import getGuild from '#functions/getGuild';
import { guildToString } from '#util/stringFormatters';
import logger from '#util/logger';
import { spam } from '#config';

const blacklist = new Josh({
  name: 'blacklist',
  provider,
  providerOptions: {
    dataDir: './data',
  },
});

const isValidGuild = async (guildId: Snowflake): Promise<boolean> => !!(await getGuild(guildId));

export default class BlacklistManager {
  constructor() {
    throw new Error(`The ${this.constructor.name} class may not be instantiated.`);
  }

  static async startupCheck() {
    logger.debug('Checking for blacklisted guilds...');
    (await blacklist.keys).forEach(async (guildId) => {
      if (spam.autoLeave) this.leaveGuild(guildId);
    });
  }

  static async isBlacklisted(guildId: Snowflake, options = { leave: false }): Promise<boolean> {
    if (!(await blacklist.has(guildId))) return false;
    if (options.leave) this.leaveGuild(guildId);
    return true;
  }

  static async add(guildId: Snowflake): Promise<string> {
    if (!isValidGuild) return 'Invalid server ID provided.';
    if (await blacklist.has(guildId)) return `${guildId} is already blacklisted.`;

    await blacklist.set(guildId, true);
    this.leaveGuild(guildId, true);
    return `Added ${guildId} to the blacklist.`;
  }

  static async remove(guildId: Snowflake): Promise<string> {
    if (!(await blacklist.has(guildId))) return `${guildId} is not blacklisted.`;

    await blacklist.delete(guildId);
    return `Removed ${guildId} from the blacklist.`;
  }

  static async leaveGuild(guildId: Snowflake, force = false) {
    const guild = force ? await getGuild(guildId) : client.guilds.cache.get(guildId);
    if (!guild) return logger.warn(`Failed to fetch guild ${guildId} to leave.`);

    guild
      .leave()
      .then(() => logger.info(`Left blacklisted guild ${guildToString(guild)}`))
      .catch(logger.error);
  }
}
