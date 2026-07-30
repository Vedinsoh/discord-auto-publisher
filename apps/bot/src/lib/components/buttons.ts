import { ButtonBuilder, ButtonStyle } from 'discord.js';
import { emojis, links } from 'lib/constants/index.js';

export const website = new ButtonBuilder()
  .setLabel(links.hostname)
  .setURL(links.website)
  .setStyle(ButtonStyle.Link);

export const getPremium = new ButtonBuilder()
  .setLabel('Get Premium')
  .setURL(links.premiumPage)
  .setStyle(ButtonStyle.Link);

// Built per call, not at module scope: `emojis.botBrand` is only resolved to the
// app emoji at startup, so a builder created at import time would capture the
// unicode fallback forever.
export const botInvite = () =>
  new ButtonBuilder()
    .setEmoji(emojis.botBrand)
    .setLabel('Invite the bot!')
    .setURL(links.botInvite)
    .setStyle(ButtonStyle.Link);

export const supportServer = new ButtonBuilder()
  .setLabel('Support server')
  .setURL(links.supportGuildInvite)
  .setStyle(ButtonStyle.Link);

export const Buttons = {
  website,
  getPremium,
  botInvite,
  supportServer,
};
