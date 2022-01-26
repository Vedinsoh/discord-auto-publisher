import { Message } from 'discord.js-light';
import client from '#client';
import { Command } from '#structures/Command';
import { log } from '#config';

// TODO
export default new Command('uptime', async ({ channel }: Message) => {
  if (client.uptime) {
    channel.send(client.uptime.toLocaleString(log.locale, { maximumFractionDigits: 2 }));
  }
});
