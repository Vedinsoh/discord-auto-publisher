import { Message } from 'discord.js-light';
import client from '#client';
import { AutoPublisherClient } from '#structures/Client';
import { Command } from '#structures/Command';
import { loggingLevel } from '#config';
import logger from '#util/logger';

const enable = ['1', 'true', 'enable', 'accept', 'on', 'yes'];
const disable = ['0', 'false', 'disable', 'deny', 'off', 'no'];

const setLevel = async (level: string) => {
  await client.cluster.broadcastEval(
    (c: AutoPublisherClient, { level }) => c.setLoggerLevel(level),
    { context: { level } }
  ).catch(logger.error);
};

export default new Command('debug', async ({ channel }: Message, value: string) => {
  if (enable.includes(value)) {
    await setLevel('debug');
    channel.send('Debug mode on.');
  } else if (disable.includes(value)) {
    await setLevel(loggingLevel === 'debug' ? 'info' : loggingLevel);
    channel.send('Debug mode off.');
  } else {
    channel.send(`Please provide a valid argument:\n\`${enable.join(', ')}\`\nor\n\`${disable.join(', ')}\``);
  }
});
