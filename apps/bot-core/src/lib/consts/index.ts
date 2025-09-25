import { env } from '../config/env.js';

export const links = {
  website: 'https://auto-publisher.gg',
  supportGuildInvite: 'https://discord.gg/xcEeJkdQX8',
  botInvite: `https://discord.com/oauth2/authorize?client_id=${env.BOT_APP_ID}&permissions=10240&integration_type=0&scope=bot+applications.commands`,
};
