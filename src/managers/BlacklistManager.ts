import { getInfo } from 'discord-hybrid-sharding';
import { Client, ShardClientUtil, Snowflake } from 'discord.js';
import client from '#client';
import config from '#config';
import { BlacklistEventType, Guild } from '#schemas/database/Guild';
import { MongoDBClient } from '#structures/MongoDBClient';
import getGuild from '#util/getGuild';
import { guildToString } from '#util/stringFormatters';

type BlacklistEventOptions = Partial<{
  reason: string | null;
}>;

const isValidGuild = async (guildId: Snowflake) => !!(await getGuild(guildId));

class BlacklistManager extends MongoDBClient {
  async startupCheck() {
    client.logger.debug('Checking for blacklisted guilds...');

    const guildIds: Snowflake[] = (
      await Guild.find(
        {
          isBlacklisted: true,
        },
        {
          guildId: 1,
        }
      )
    ).map((guild) => guild.guildId);

    guildIds.forEach(async (guildId) => {
      if (client.guilds.cache.get(guildId) && config.antiSpam.autoLeave) this.leaveGuild(guildId);
    });
  }

  async _get(guildId: Snowflake) {
    return Guild.findOne({ guildId });
  }

  async has(guildId: Snowflake) {
    const guild = await this._get(guildId);
    return Boolean(guild && guild.isBlacklisted);
  }

  async add(guildId: Snowflake, options?: BlacklistEventOptions) {
    if (!(await isValidGuild(guildId))) return 'Invalid server ID provided.';
    if (await this.has(guildId)) return `${guildId} is already blacklisted.`;

    const guild = await this._get(guildId);

    if (guild) {
      guild.blacklistEvents.push({
        type: BlacklistEventType.Blacklist,
        timestamp: new Date(),
        reason: options?.reason || null,
      });
      await guild.save();
    } else {
      const newGuild = new Guild({
        guildId: guildId,
        isBlacklisted: true,
        blacklistEvents: [
          {
            type: BlacklistEventType.Blacklist,
            timestamp: new Date(),
            reason: options?.reason || null,
          },
        ],
      });
      await newGuild.save();
    }

    this.leaveGuild(guildId);
    return `Added ${guildId} to the blacklist.`;
  }

  async remove(guildId: Snowflake, options?: BlacklistEventOptions) {
    const guild = await this._get(guildId);

    if (!guild || !guild.isBlacklisted) return `${guildId} is not blacklisted.`;

    guild.isBlacklisted = false;
    guild.blacklistEvents.push({
      type: BlacklistEventType.Unblacklist,
      timestamp: new Date(),
      reason: options?.reason || null,
    });
    await guild.save();

    return `Removed ${guildId} from the blacklist.`;
  }

  async leaveGuild(guildId: Snowflake) {
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
      guild
        .leave()
        .then(() => client.logger.info(`Left blacklisted guild ${guildToString(guild)}`))
        .catch(client.logger.error);
      return;
    }

    // * In case the guild is not on the same shard
    const shardData = getInfo();
    const shardId = ShardClientUtil.shardIdForGuildId(guildId, shardData.TOTAL_SHARDS);

    client.cluster
      .broadcastEval(
        async (c: Client, { guildId }: { guildId: Snowflake }) => {
          const guild = c.guilds?.cache?.get(guildId);
          if (guild) return await guild.leave();
          return;
        },
        {
          cluster: shardId,
          context: { guildId },
        }
      )
      .then(() => client.logger.info(`Left blacklisted guild ${guildId}`))
      .catch(client.logger.error);
  }
}

export default BlacklistManager;
