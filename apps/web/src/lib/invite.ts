import type { Edition } from '@/lib/api/types';

export const BOT_INVITE_PERMISSIONS = '10240';
export const BOT_INVITE_SCOPE = 'bot+applications.commands';

/**
 * Client-visible deployment config, resolved on the server and handed to the
 * client through {@link SiteConfigProvider}.
 *
 * Deliberately not `NEXT_PUBLIC_*`: those are inlined at build time, which
 * would force every self-hoster to rebuild the web image with their own client
 * id baked in. Passing them through a server-rendered context keeps the image
 * configurable purely at runtime.
 */
export type SiteConfig = {
  /** False for a self-hosted copy: no billing, no upgrade paths, one bot. */
  isPublicInstance: boolean;
  /** Self-host: the single application's id, which is also the OAuth client. */
  freeBotId: string;
  /** Public instance only — empty when self-hosted (there is no second bot). */
  premiumBotId: string;
};

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
  config: SiteConfig,
  edition: Edition,
  guildId?: string,
  options?: { lockGuildSelect?: boolean }
): string | null {
  const clientId =
    edition === 'premium' && config.premiumBotId ? config.premiumBotId : config.freeBotId;
  if (!clientId) return null;
  const guildParam = guildId ? `&guild_id=${guildId}` : '';
  const lockParam = guildId && options?.lockGuildSelect ? '&disable_guild_select=true' : '';
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${BOT_INVITE_PERMISSIONS}&integration_type=0&scope=${BOT_INVITE_SCOPE}${guildParam}${lockParam}`;
}
