const HOSTNAME = 'auto-publisher.gg';
const WEBSITE = `https://${HOSTNAME}`;

export const links = {
  hostname: HOSTNAME,
  website: WEBSITE,
  dashboard: `${WEBSITE}/dashboard`,
  premiumPage: `${WEBSITE}/premium`,
  supportGuildInvite: 'https://discord.gg/xcEeJkdQX8',
  botInvite: `https://discord.com/oauth2/authorize?client_id=739823232651100180&permissions=10240&integration_type=0&scope=bot+applications.commands`,
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
