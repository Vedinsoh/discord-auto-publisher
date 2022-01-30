import Josh from '@joshdb/core';
import provider from '@joshdb/json'; // TODO
import { Guild } from 'discord.js-light';
import getGuild from '#functions/getGuild';
import { guildToString } from '#util/stringFormatters';
import logger from '#util/logger';

const isValidGuild = async (guildId: string): Promise<boolean> => !!(await getGuild(guildId));

export default class BlacklistManager {
  blacklist = new Josh({
    name: 'blacklist',
    provider,
    providerOptions: {
      dataDir: './data',
    },
  });

  async startupCheck() {
    logger.debug('Checking for blacklisted guilds.');
    (await this.blacklist.keys).forEach(async (guildId) => {
      const guild = await getGuild(guildId);
      if (guild) this.leaveGuild(guild);
    });
  }

  async isBlacklisted(guild: Guild, options = { leave: false }): Promise<boolean> {
    if (await this.blacklist.has(guild.id)) {
      if (options.leave) this.leaveGuild(guild);
      return true;
    }
    return false;
  }

  async add(guildId: string): Promise<string> {
    if (!isValidGuild) return 'Invalid server ID provided.';
    if (await this.blacklist.has(guildId)) return `${guildId} is already blacklisted.`;

    await this.blacklist.set(guildId, true);
    return `Added ${guildId} to the blacklist.`;
  }

  async remove(guildId: string): Promise<string> {
    if (!isValidGuild) return 'Invalid server ID provided.';
    if (!(await this.blacklist.has(guildId))) return `${guildId} is not blacklisted.`;

    await this.blacklist.delete(guildId);
    return `Removed ${guildId} from the blacklist.`;
  }

  leaveGuild(guild: Guild) {
    guild
      .leave()
      .then(() => logger.info(`Left blacklisted guild ${guildToString(guild)}`))
      .catch((error) => logger.error(error));
  }
}
