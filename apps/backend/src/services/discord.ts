import type { Edition } from '@ap/api-types';
import { env, isPublicInstance } from '@ap/config';
import { createTtlCache, sortBySidebarOrder } from '@ap/utils';
import { DiscordAPIError, REST } from '@discordjs/rest';
import type { Snowflake } from 'discord-api-types/globals';
import {
  type APIChannel,
  type APIUser,
  ChannelType,
  RESTJSONErrorCodes,
  Routes,
} from 'discord-api-types/v10';
import { logger } from 'utils/logger.js';

// A self-hosted instance runs a single bot, which registers as `premium`
// (see @ap/config). Its credentials come from the singular variables, so
// `free` resolves to an empty token and `hasToken('free')` is false — which is
// exactly what the presence sweeps and join rails already key off.
const tokenFor = (edition: Edition): string => {
  if (!isPublicInstance) return edition === 'premium' ? env.DISCORD_BOT_TOKEN : '';
  return edition === 'premium' ? env.DISCORD_BOT_TOKEN_PREMIUM : env.DISCORD_BOT_TOKEN_FREE;
};

const proxyUrlFor = (edition: Edition): string => {
  if (!isPublicInstance) return env.PROXY_URL;
  return edition === 'premium' ? env.PROXY_URL_PREMIUM : env.PROXY_URL_FREE;
};

// One REST client per edition, each routed through its edition's proxy so
// Discord traffic keeps the per-edition egress IP (Cloudflare ban isolation).
// An unset token (self-host's `free` slot, or a dev subset without this
// edition) fails client-side in @discordjs/rest before any HTTP is sent.
const restByEdition: Record<Edition, REST> = {
  free: new REST({ api: `${proxyUrlFor('free')}/api` }).setToken(tokenFor('free')),
  premium: new REST({ api: `${proxyUrlFor('premium')}/api` }).setToken(tokenFor('premium')),
};

const restFor = (edition: Edition): REST => restByEdition[edition];

const hasToken = (edition: Edition): boolean => Boolean(tokenFor(edition));

const botUserIds: Partial<Record<Edition, Snowflake>> = {};

/** Bot application's user ID for an edition (fetched once, cached for process lifetime) */
const getBotUserId = async (edition: Edition): Promise<Snowflake> => {
  const cached = botUserIds[edition];
  if (cached) return cached;
  const user = (await restFor(edition).get(Routes.user())) as APIUser;
  botUserIds[edition] = user.id;
  return user.id;
};

const DISCORD_READ_CACHE_TTL_MS = 5 * 60 * 1000;
const LKG_TTL_MS = 60 * 60 * 1000;

/**
 * In-memory cache for the guild-dashboard read paths (ADR 0007). Keyed by
 * ROUTE ONLY: `GET /guilds/:id/channels` and `/roles` are guild-global (Discord
 * returns all channels/roles regardless of the fetching bot's permissions), so
 * a single entry is shared across editions — the free bot's fetch during a
 * pending handover warms the cache for the premium bot's permission eval;
 * `/members/:botId` self-namespaces by botId. `edition` only selects which
 * present bot fetches a miss (a non-member gets 404/403); only 200 responses
 * are cached, so a stray error never poisons the shared key.
 *
 * Explicit opt-in — deliberately NOT wired into `isBotInGuild`, whose
 * `/members/:botId` call must stay a LIVE membership check (a stale cached
 * member would report a departed bot as present and break presence self-heal).
 */
const discordReadCache = createTtlCache<unknown>(DISCORD_READ_CACHE_TTL_MS);

/**
 * Last-known-good store for stale-while-error (ADR 0007 amendment). Holds the
 * most recent 200 per route for 1h (longer than the 5-min fresh TTL). When a
 * live fetch on a fresh-cache miss FAILS, `cachedGet` serves this stale value
 * as a 200 instead of throwing, so a momentary Discord/proxy blip can never turn
 * a guild-dashboard read into a 500 → "temporarily unavailable" card. Deliberately
 * NOT cleared by `evictGuildChannels`/`evictGuildRoles`: eviction forces a fresh
 * fetch for correctness on a membership change; the stale value only surfaces if
 * that fresh fetch itself fails. Genuine bot-absence is owned upstream by the
 * presence layer (`healAbsentEditions` resolves presence and throws before any
 * `cachedGet` runs — 409 confirmed-absent, 503 unresolved), so serving stale on
 * ANY error here is safe.
 */
const lastKnownGood = createTtlCache<unknown>(LKG_TTL_MS);

const cachedGet = async <T>(edition: Edition, route: `/${string}`): Promise<T> => {
  const cached = discordReadCache.get(route);
  if (cached !== undefined) return cached as T;
  try {
    const result = await restFor(edition).get(route);
    discordReadCache.set(route, result);
    lastKnownGood.set(route, result);
    return result as T;
  } catch (error) {
    const stale = lastKnownGood.get(route);
    if (stale !== undefined) {
      logger.warn(error, `Discord read failed for ${route}; serving last-known-good (stale)`);
      return stale as T;
    }
    throw error;
  }
};

/**
 * The one definition of "announcement channel of this guild" — read by both the
 * dashboard's candidate list and the registration guards in `Channels.add` /
 * `Guilds.migrate`, so a channel can never be registrable but unlistable.
 *
 * Sorted because Discord's REST list is unordered.
 */
const getAnnouncementChannels = async (
  edition: Edition,
  guildId: Snowflake
): Promise<APIChannel[]> => {
  const channels = await cachedGet<APIChannel[]>(edition, Routes.guildChannels(guildId));

  const categoryPositions = new Map<string, number>();
  for (const c of channels) {
    if (c.type === ChannelType.GuildCategory) categoryPositions.set(c.id, c.position ?? 0);
  }

  return sortBySidebarOrder(
    channels.filter(c => c.type === ChannelType.GuildAnnouncement),
    c => ({
      id: c.id,
      position: 'position' in c ? (c.position ?? 0) : 0,
      parentId: ('parent_id' in c ? c.parent_id : null) ?? null,
    }),
    categoryPositions
  );
};

/**
 * Evict a guild's cached channel list (ADR 0007 amendments). Two callers:
 * `POST /internal/guild/:guildId/channels/invalidate` when a bot observes an
 * announcement-channel MEMBERSHIP change (created / deleted / type-cross), and
 * `Guilds.registerNewGuild` on re-invite to flush changes the bot could not
 * observe while absent (no gateway event while kicked). Either way a new
 * candidate appears — and a deleted one disappears — without waiting out the
 * 5-min TTL. Narrow by design: `/roles` and `/members/:botId` are left on TTL
 * (permission-ping eviction stays rejected), and a rename/reposition is not
 * evicted (cosmetic, higher-churn). The key matches `cachedGet`'s route key.
 */
const evictGuildChannels = (guildId: Snowflake): void => {
  discordReadCache.delete(Routes.guildChannels(guildId));
};

/**
 * Evict a guild's cached role list. Pinged by the premium bot's role
 * create/update/delete listeners (`POST /internal/guild/:guildId/roles/invalidate`)
 * so the dashboard's mention-filter role picker reflects a rename/create/delete
 * without waiting out the 5-min TTL. Only the premium bot pings (filters are
 * premium-only), so the free bot's role churn never reaches here. The key
 * matches `cachedGet`'s route key.
 */
const evictGuildRoles = (guildId: Snowflake): void => {
  discordReadCache.delete(Routes.guildRoles(guildId));
};

/** Outcome of a live membership check; `unknown` = Discord could not answer. */
export type BotMembership = 'present' | 'absent' | 'unknown';

/**
 * Live membership check that distinguishes "Discord said no" from "Discord
 * could not answer". `@discordjs/rest` splits these cleanly: a 4xx throws
 * `DiscordAPIError` (a real verdict — 404/`10004`/`10007` for a non-member,
 * 403 for missing access), while a 5xx throws `HTTPError` only after
 * exhausting the client's own `retries` (default 3), and a network/abort error
 * propagates raw after the same retries. So only a `DiscordAPIError` is
 * evidence of absence — everything else is `unknown` after ≥4 attempts and
 * must never be reported as absence, or a Discord/proxy outage reads as "the
 * bot was removed" (see `PresenceHeal`).
 *
 * A 429 cannot surface here: `rejectOnRateLimit` is unset on these clients, so
 * the limit is waited out internally instead of thrown.
 */
const getBotMembership = async (edition: Edition, guildId: Snowflake): Promise<BotMembership> => {
  // Resolved outside the classified call: a failure here (rotated token, a
  // `/users/@me` blip) says nothing about THIS guild, so it must not read as
  // absence — otherwise one bad token reports every guild as botless.
  let botUserId: Snowflake;
  try {
    botUserId = await getBotUserId(edition);
  } catch (error) {
    logger.warn(error, `Could not resolve ${edition} bot user id; membership unknown`);
    return 'unknown';
  }

  try {
    await restFor(edition).get(Routes.guildMember(guildId, botUserId));
    return 'present';
  } catch (error) {
    if (error instanceof DiscordAPIError) return 'absent';
    logger.warn(error, `Membership check for guild ${guildId} (${edition}) was inconclusive`);
    return 'unknown';
  }
};

/**
 * Live membership check: whether an edition's bot is currently in the guild.
 * Errors (including network failures) report false — callers use this to
 * avoid evicting the OTHER bot, so the safe answer is "not present".
 *
 * Callers that must NOT treat an unreachable Discord as absence (the dashboard
 * presence self-heal) use `getBotMembership` directly instead.
 */
const isBotInGuild = async (edition: Edition, guildId: Snowflake): Promise<boolean> =>
  (await getBotMembership(edition, guildId)) === 'present';

/**
 * Makes an edition's bot leave a guild. Idempotent: the bot may already be
 * gone (kick, guild deleted). Returns true when the bot is not in the guild
 * after the call — including a `10004 Unknown Guild`, which means it was
 * already absent (the desired state). Returns false only on a real failure
 * (network / 5xx / actual double coverage), so callers like the handover swap
 * alert only when a leave genuinely did not take effect.
 */
const leaveGuild = async (edition: Edition, guildId: Snowflake): Promise<boolean> => {
  try {
    await restFor(edition).delete(Routes.userGuild(guildId));
    logger.info(`Left guild ${guildId} (${edition} bot)`);
    return true;
  } catch (error) {
    if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownGuild) {
      logger.debug(`Guild ${guildId} already absent (${edition} bot): 10004`);
      return true;
    }
    logger.debug(error, `Could not leave guild ${guildId} (${edition} bot)`);
    return false;
  }
};

const USERNAME_CACHE_TTL_MS = 60 * 60 * 1000;
const usernameCache = createTtlCache<string>(USERNAME_CACHE_TTL_MS);

/**
 * Display name of a Discord user, resolved through the premium proxy and cached
 * in-memory for 1h (backend is single-instance; one lookup per premium guild).
 * Failures are not cached — returns null so callers fall back to the raw ID.
 */
const getUsername = async (userId: string): Promise<string | null> => {
  const cached = usernameCache.get(userId);
  if (cached !== undefined) return cached;

  try {
    const user = (await restFor('premium').get(Routes.user(userId))) as APIUser;
    const username = user.global_name ?? user.username;
    usernameCache.set(userId, username);
    return username;
  } catch {
    return null;
  }
};

export const Discord = {
  restFor,
  cachedGet,
  getAnnouncementChannels,
  evictGuildChannels,
  evictGuildRoles,
  hasToken,
  getBotUserId,
  getBotMembership,
  isBotInGuild,
  leaveGuild,
  getUsername,
};
