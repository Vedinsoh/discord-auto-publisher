import type { Edition } from '@/lib/api/types';

export const FREE_BOT_CLIENT_ID = '739823232651100180';
export const PREMIUM_BOT_CLIENT_ID = process.env.NEXT_PUBLIC_PREMIUM_BOT_CLIENT_ID;

export const BOT_INVITE_PERMISSIONS = '10240';
export const BOT_INVITE_SCOPE = 'bot+applications.commands';

/**
 * Guild-targeted bot invite. Falls back to the free bot when the premium
 * client ID is not configured in this deployment.
 */
export function getBotInviteUrl(edition: Edition, guildId: string): string {
  const clientId =
    edition === 'premium' && PREMIUM_BOT_CLIENT_ID ? PREMIUM_BOT_CLIENT_ID : FREE_BOT_CLIENT_ID;
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${BOT_INVITE_PERMISSIONS}&integration_type=0&scope=${BOT_INVITE_SCOPE}&guild_id=${guildId}&disable_guild_select=true`;
}
