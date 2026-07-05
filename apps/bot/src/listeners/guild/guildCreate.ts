import { config } from '@ap/config';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Data } from 'data/index.js';
import { ChannelType, Events, type Guild } from 'discord.js';
import { logger } from 'utils/logger.js';

@ApplyOptions<Listener.Options>({
  event: Events.GuildCreate,
})
export class GuildCreateListener extends Listener {
  public async run(guild: Guild) {
    // Insert row / clear soft delete; the live announcement channel list (from
    // the GUILD_CREATE payload, no REST) lets the backend prune config for
    // channels deleted while the bot was kicked (missed channelDelete events)
    const announcementChannelIds = guild.channels.cache
      .filter(c => c.type === ChannelType.GuildAnnouncement)
      .map(c => c.id);
    await Data.API.Backend.registerNewGuild(guild.id, announcementChannelIds);

    // Premium instance: verify active subscription before staying
    if (config.isPremiumInstance) {
      try {
        const response = await fetch(
          `http://backend:8080/api/internal/guild/${guild.id}/subscription-status`
        );
        const data = (await response.json()) as { data?: { active: boolean } };

        if (!data.data?.active) {
          logger.warn(`Leaving guild ${guild.id}: no active subscription`);
          await guild.leave();
        }
      } catch (error) {
        logger.error(error, `Failed to check subscription status for guild ${guild.id}`);
      }
    }
  }
}
