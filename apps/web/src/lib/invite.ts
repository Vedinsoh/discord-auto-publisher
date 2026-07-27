import type { Edition } from '@/lib/api/types';

export const FREE_BOT_CLIENT_ID = process.env.NEXT_PUBLIC_FREE_BOT_CLIENT_ID;
export const PREMIUM_BOT_CLIENT_ID = process.env.NEXT_PUBLIC_PREMIUM_BOT_CLIENT_ID;

export const BOT_INVITE_PERMISSIONS = '10240';
export const BOT_INVITE_SCOPE = 'bot+applications.commands';

/**
 * Bot invite URL. Falls back to the free bot when the premium client ID is not
 * configured; returns null when the resolved client ID is unset (no hardcoded
 * fallback — client IDs differ per deployment).
 * Omit `guildId` for the guild-agnostic marketing invite (Discord shows its own
 * guild picker). Pass it to pre-select a guild; `lockGuildSelect` then disables
 * the dropdown — reserve it for invites tied to a specific guild (e.g. the
 * post-payment premium invite).
 */
export function getBotInviteUrl(
  edition: Edition,
  guildId?: string,
  options?: { lockGuildSelect?: boolean }
): string | null {
  const clientId =
    edition === 'premium' && PREMIUM_BOT_CLIENT_ID ? PREMIUM_BOT_CLIENT_ID : FREE_BOT_CLIENT_ID;
  if (!clientId) return null;
  const guildParam = guildId ? `&guild_id=${guildId}` : '';
  const lockParam = guildId && options?.lockGuildSelect ? '&disable_guild_select=true' : '';
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${BOT_INVITE_PERMISSIONS}&integration_type=0&scope=${BOT_INVITE_SCOPE}${guildParam}${lockParam}`;
}
