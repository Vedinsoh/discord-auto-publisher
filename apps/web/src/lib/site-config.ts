import 'server-only';
import { env, isPublicInstance } from '@ap/config';
import type { SiteConfig } from '@/lib/invite';

/**
 * Resolve deployment config on the server, once per render.
 *
 * A self-hosted instance runs ONE Discord application: the same client id logs
 * the admin in and is the bot they invite. The public instance authenticates
 * with one application but invites two others, which is why the pair exists.
 */
export function getSiteConfig(): SiteConfig {
  return {
    isPublicInstance,
    freeBotId: isPublicInstance ? env.DISCORD_FREE_BOT_ID : env.DISCORD_CLIENT_ID,
    premiumBotId: isPublicInstance ? env.DISCORD_PREMIUM_BOT_ID : '',
  };
}
