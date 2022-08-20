import type { Level as LoggerLevel } from 'pino';
import client from '#client';
import config from '#config';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';
import logger from '#util/logger';

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

export default new AdminCommand(CommandNames.DEBUG, async ({ channel }, value) => {
  if (![...enable, ...disable].includes(value)) {
    channel.send(`Please provide a valid argument:\n\`${enable.join(', ')}\`\nor\n\`${disable.join(', ')}\``);
    return;
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
