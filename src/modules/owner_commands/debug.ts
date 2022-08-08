import { Message } from 'discord.js-light';
import client from '#client';
import config from '#config';
import { Command } from '#structures/Command';
import logger from '#util/logger';
import { Level as LoggerLevel } from 'pino';

const { loggingLevel } = config;

const enable = ['1', 'true', 'enable', 'accept', 'on', 'yes'];
const disable = ['0', 'false', 'disable', 'deny', 'off', 'no'];

const setLevel = async (level: LoggerLevel) =>
  await client.cluster
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .broadcastEval((c, { level }) => c.setLoggerLevel(level), {
      context: { level },
    })
    .catch(logger.error);

export default new Command('debug', async ({ channel }: Message, value: string) => {
  if (![...enable, ...disable].includes(value)) {
    return channel.send(`Please provide a valid argument:\n\`${enable.join(', ')}\`\nor\n\`${disable.join(', ')}\``);
  }

  if (enable.includes(value)) {
    setLevel('debug').then(() => channel.send('Debug mode on.'));
  }
  if (disable.includes(value)) {
    setLevel(loggingLevel === 'debug' ? 'info' : (loggingLevel as LoggerLevel)).then(() =>
      channel.send('Debug mode off.')
    );
  }
});
