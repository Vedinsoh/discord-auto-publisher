import { Message } from 'discord.js-light';
import client from '#client';
import { Command } from '#structures/Command';
import { stringLocale } from '#config';

// TODO
export default new Command('uptime', async ({ channel }: Message) => {
  if (client.uptime) {
    channel.send(client.uptime.toLocaleString(stringLocale, { maximumFractionDigits: 2 }));
  }
});
