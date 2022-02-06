import Josh from '@joshdb/core';
import provider from '@joshdb/json'; // TODO remove noImplicitAny from tsconfig
import { Guild } from 'discord.js-light';
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

const isValidGuild = async (guildId: string): Promise<boolean> => !!(await getGuild(guildId));

export default class BlacklistManager {
  constructor() {
    throw new Error(`The ${this.constructor.name} class may not be instantiated.`);
  }

  static async startupCheck() {
    logger.debug('Checking for blacklisted guilds.');
    (await blacklist.keys).forEach(async (guildId) => {
      const guild = await getGuild(guildId); // TODO get per shard rather than all
      if (guild && spam.autoLeave) this.leaveGuild(guild);
    });
  }

  static async isBlacklisted(guild: Guild, options = { leave: false }): Promise<boolean> {
    if (await blacklist.has(guild.id)) {
      if (options.leave) this.leaveGuild(guild);
      return true;
    }
    return false;
  }

  static async add(guildId: string): Promise<string> {
    if (!isValidGuild) return 'Invalid server ID provided.';
    if (await blacklist.has(guildId)) return `${guildId} is already blacklisted.`;

    await blacklist.set(guildId, true);
    return `Added ${guildId} to the blacklist.`;
  }

  static async remove(guildId: string): Promise<string> {
    if (!isValidGuild) return 'Invalid server ID provided.';
    if (!(await blacklist.has(guildId))) return `${guildId} is not blacklisted.`;

    await blacklist.delete(guildId);
    return `Removed ${guildId} from the blacklist.`;
  }

  static leaveGuild(guild: Guild) {
    guild
      .leave()
      .then(() => logger.info(`Left blacklisted guild ${guildToString(guild)}`))
      .catch((error) => logger.error(error));
  }
}
