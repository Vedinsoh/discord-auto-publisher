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

export const emojis = {
  botFree: '<:auto_publisher:1444800510489264298>',
  checkmark: '<:ap_check_mark:1444784796470612089>',
  crossmark: '<:ap_cross_mark:1444785716348321933>',
  info: '<:ap_info:1444787324310519899>',
  warning: '<:ap_warning:1444787044110041230>',
  filter: '<:ap_filter:1445407254550679613>',
  greenCircle: '<:ap_green_circle_dot:1444788894913532128>',
  yellowCircle: '<:ap_yellow_circle_dot:1445046944140628073>',
  redCircle: '<:ap_red_circle_dot:1444789399966715955>',
};

export const notes = {
  rateLimit: 'Discord only allows up to 10 messages to be published per hour per channel!',
  publishDelayFree:
    "Messages may be delayed during busy periods to respect Discord's rate limits — but every message will be published. Upgrade to Premium for faster publishing.",
  publishDelayPremium:
    'Messages are published almost instantly — Premium runs on dedicated capacity, so delays stay rare even at peak times.',
  permissionsExtendedDisable:
    "Don't keep permissions disabled for too long, as the bot will automatically disable channels that lack proper permissions for an extended period.",
} as const;
