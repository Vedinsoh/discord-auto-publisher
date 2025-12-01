import { env } from 'lib/config/env.js';

export const links = {
  website: 'https://auto-publisher.gg',
  supportGuildInvite: 'https://discord.gg/xcEeJkdQX8',
  botInvite: `https://discord.com/oauth2/authorize?client_id=${env.BOT_APP_ID}&permissions=10240&integration_type=0&scope=bot+applications.commands`,
};

export const emojis = {
  botFree: '<:auto_publisher:1444800510489264298>',
  checkmark: '<:ap_check_mark:1444784796470612089>',
  crossmark: '<:ap_cross_mark:1444785716348321933>',
  info: '<:ap_info:1444787324310519899>',
  warning: '<:ap_warning:1444787044110041230>',
  greenCircle: '<:ap_green_circle_dot:1444788894913532128>',
  yellowCircle: '<:ap_yellow_circle_dot:1445046944140628073>',
  redCircle: '<:ap_red_circle_dot:1444789399966715955>',
};

export const messages = {
  delayNote:
    process.env.APP_EDITION === 'free'
      ? '\n\n-# Note: Messages might have delays in publishing due to Discord API limits.'
      : '',
};
