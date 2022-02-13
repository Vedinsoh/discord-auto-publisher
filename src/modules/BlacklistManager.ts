import Josh from '@joshdb/core';
import provider from '@joshdb/json'; // TODO remove noImplicitAny from tsconfig
import { Guild } from 'discord.js-light';
import { Snowflake } from 'discord-api-types';
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
      const guild = client.guilds.cache.get(guildId);
      if (guild && spam.autoLeave) this.leaveGuild(guild);
    });
  }

  static async isBlacklisted(guildId: Snowflake, options = { leave: false }): Promise<boolean> {
    if (!(await blacklist.has(guildId))) return false;

    if (options.leave) {
      const guild = await getGuild(guildId);
      if (guild) this.leaveGuild(guild);
    }
    return true;
  }

  static async add(guildId: Snowflake): Promise<string> {
    if (!isValidGuild) return 'Invalid server ID provided.';
    if (await blacklist.has(guildId)) return `${guildId} is already blacklisted.`;

    await blacklist.set(guildId, true);
    return `Added ${guildId} to the blacklist.`;
  }

  static async remove(guildId: Snowflake): Promise<string> {
    if (!(await blacklist.has(guildId))) return `${guildId} is not blacklisted.`;

    await blacklist.delete(guildId);
    return `Removed ${guildId} from the blacklist.`;
  }

  static leaveGuild(guild: Guild) {
    guild
      .leave()
      .then(() => logger.info(`Left blacklisted guild ${guildToString(guild)}`))
      .catch(logger.error);
  }
}
