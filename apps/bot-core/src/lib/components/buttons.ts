import { ButtonBuilder, ButtonStyle } from 'discord.js';
import { links } from 'lib/consts/index.js';

export const website = new ButtonBuilder()
  .setLabel('Website')
  .setURL(links.website)
  .setStyle(ButtonStyle.Link);

export const botInvite = new ButtonBuilder()
  .setLabel('Invite the bot!')
  .setURL(links.botInvite)
  .setStyle(ButtonStyle.Link);

export const supportServer = new ButtonBuilder()
  .setLabel('Support server')
  .setURL(links.supportGuildInvite)
  .setStyle(ButtonStyle.Link);

export const Buttons = {
  website,
  botInvite,
  supportServer,
};
