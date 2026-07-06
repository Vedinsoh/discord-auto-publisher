import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Data } from 'data/index.js';
import { ChannelType, Events, type Guild } from 'discord.js';
import { Services } from 'services/index.js';

@ApplyOptions<Listener.Options>({
  event: Events.GuildCreate,
})
export class GuildCreateListener extends Listener {
  public async run(guild: Guild) {
    // Premium: idle the hot path until registration completes — the backend
    // writes the handover marker during registerNewGuild, and a message
    // arriving before the response lands must not latch "active" first.
    // Must be set synchronously, before the first await.
    Services.Handover.beginRegistration(guild.id);

    try {
      // Register this edition's presence; the live announcement channel list
      // (from the GUILD_CREATE payload, no REST) lets the backend prune config
      // for channels deleted while the bot was kicked (missed channelDelete
      // events). The backend owns every join/leave decision — premium
      // entitlement gate, handover orchestration, free leave while premium
      // manages (ADR 0006) — so there is no bot-side subscription check.
      const announcementChannelIds = guild.channels.cache
        .filter(c => c.type === ChannelType.GuildAnnouncement)
        .map(c => c.id);
      await Data.API.Backend.registerNewGuild(guild.id, announcementChannelIds);
    } finally {
      // Registration failure falls back to the plain marker read (fail open;
      // the reconcile sweep repairs any missed orchestration)
      Services.Handover.endRegistration(guild.id);
    }
  }
}
