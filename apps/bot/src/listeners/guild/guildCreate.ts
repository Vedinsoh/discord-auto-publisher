import { config } from '@ap/config';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Data } from 'data/index.js';
import { Events, type Guild } from 'discord.js';
import { logger } from 'utils/logger.js';

@ApplyOptions<Listener.Options>({
  event: Events.GuildCreate,
})
export class GuildCreateListener extends Listener {
  public async run(guild: Guild) {
    // Register new guild in cache (use new system from day 1)
    // MIGRATION: After transition (6 months), remove this listener entirely
    await Data.API.Backend.registerNewGuild(guild.id);

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
