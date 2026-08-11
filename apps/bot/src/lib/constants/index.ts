import { env, isPublicInstance } from '@ap/config';

const HOSTNAME = 'auto-publisher.gg';
const WEBSITE = `https://${HOSTNAME}`;

/** `Send Messages` + `Manage Messages` */
const BOT_INVITE_PERMISSIONS = '10240';

const buildBotInvite = (clientId: string): string =>
  `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${BOT_INVITE_PERMISSIONS}&integration_type=0&scope=bot+applications.commands`;

/**
 * Web surface this instance points at. The hosted service has a marketing site;
 * a self-hosted copy's only web surface is the operator's own dashboard, so
 * linking `auto-publisher.gg` there would send their admins to someone else's
 * deployment — with their guild id in the URL.
 */
const webBase = (): string => {
  if (isPublicInstance) return WEBSITE;
  try {
    return new URL(env.WEB_APP_ORIGIN).origin;
  } catch {
    return WEBSITE;
  }
};

const BASE = webBase();

export const links = {
  hostname: BASE.replace(/^https?:\/\//, ''),
  website: BASE,
  dashboard: `${BASE}/dashboard`,
  premiumPage: `${WEBSITE}/premium`,
  supportGuildInvite: 'https://discord.gg/xcEeJkdQX8',
  /**
   * Replaced at startup with this application's own id ({@link setBotInvite}).
   * Seeded with the hosted bot's id rather than an empty string so the value is
   * always a valid URL — `ButtonBuilder.setURL('')` would throw.
   */
  botInvite: buildBotInvite('739823232651100180'),
};

/**
 * Point the invite button at THIS application. Called once at ready, where the
 * id is known without a REST call; for the hosted bot it resolves to the same
 * id it was seeded with.
 */
export const setBotInvite = (clientId: string): void => {
  links.botInvite = buildBotInvite(clientId);
};

/**
 * Unicode fallbacks, replaced in place by `hydrateEmojis` at startup once the
 * app-owned emoji ids are resolved. A key whose name is missing from this
 * edition's app keeps its fallback, so a partial upload degrades cosmetically
 * instead of leaking raw `<:name:id>` text into replies.
 */
export const emojis = {
  botBrand: '📢',
  checkmark: '✅',
  crossmark: '❌',
  info: 'ℹ️',
  warning: '⚠️',
  filter: '🔍',
  greenCircle: '🟢',
  redCircle: '🔴',
};

/**
 * App-emoji names, identical across all four applications (free/premium ×
 * dev/prod) — only the snowflake differs, so ids are resolved at runtime rather
 * than hardcoded per client.
 *
 * These must be app-owned emojis, not guild-hosted ones: a guild emoji only
 * renders for a bot that shares that guild, and the handover rails keep exactly
 * one edition in any given guild — including the support server that used to
 * host them, which left the evicted edition rendering plain text.
 */
export const emojiNames: Record<keyof typeof emojis, string> = {
  botBrand: 'auto_publisher',
  checkmark: 'checkmark',
  crossmark: 'crossmark',
  info: 'info',
  warning: 'warning',
  filter: 'filter',
  greenCircle: 'green_circle_dot',
  redCircle: 'red_circle_dot',
};

export const notes = {
  rateLimit: 'Discord allows up to 10 messages to be published per hour per channel.',
  publishDelayFree:
    "Messages may be delayed during busy periods to respect Discord's rate limits — but every message will be published. Upgrade to Premium for faster publishing.",
  publishDelayPremium:
    'Messages are published almost instantly — Premium runs on dedicated capacity, so delays stay rare even at peak times.',
  permissionsExtendedDisable:
    "Don't keep permissions disabled for too long, as the bot will automatically disable channels that lack proper permissions for an extended period.",
} as const;
