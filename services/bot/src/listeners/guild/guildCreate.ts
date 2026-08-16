import { Events } from 'discord.js';
import { Data } from '#data';
import Event from '#structures/Event';
import { logger } from '#utils/logger';

/**
 * Seeds the onboarding boost budget for a newly-joined guild (ADR 0004).
 *
 * This fires on genuine joins only. discord.js emits `guildCreate` solely on a
 * `client.guilds.cache` miss while the WebSocketManager is `Ready`, and the READY
 * payload registers every guild the shard already has before any replayed
 * GUILD_CREATE can arrive — so neither startup nor a shard re-identify reaches here.
 */
export default new Event(Events.GuildCreate, async (guild) => {
  try {
    await Data.API.Proxy.seedBoost(guild.id);
  } catch (error) {
    // Losing a boost is cosmetic; never let it surface as an unhandled rejection.
    logger.warn({ event: 'boost.seed_failed', guildId: guild.id, err: error }, 'Failed to seed onboarding boost');
  }
});
