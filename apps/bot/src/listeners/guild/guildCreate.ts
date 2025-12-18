import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Data } from 'data/index.js';
import { Events, type Guild } from 'discord.js';

@ApplyOptions<Listener.Options>({
  event: Events.GuildCreate,
})
export class GuildDeleteListener extends Listener {
  public async run(guild: Guild) {
    // Register new guild in cache (use new system from day 1)
    // MIGRATION: After transition (6 months), remove this listener entirely
    await Data.API.Backend.registerNewGuild(guild.id);
  }
}
