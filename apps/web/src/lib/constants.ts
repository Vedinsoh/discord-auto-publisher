import { BOT_INVITE_PERMISSIONS, BOT_INVITE_SCOPE, FREE_BOT_CLIENT_ID } from '@/lib/invite';

export const links = {
  discordSupportServer: 'https://discord.gg/xcEeJkdQX8',
  supportEmail: 'support@auto-publisher.gg',
  discordBotInvite: `https://discord.com/oauth2/authorize?client_id=${FREE_BOT_CLIENT_ID}&permissions=${BOT_INVITE_PERMISSIONS}&integration_type=0&scope=${BOT_INVITE_SCOPE}`,
  githubRepo: 'https://github.com/Vedinsoh/discord-auto-publisher',
  githubAuthor: 'https://github.com/Vedinsoh',
};

export const values = {
  activeServers: 17000,
  messagesPublished: 100_000_000,
};
