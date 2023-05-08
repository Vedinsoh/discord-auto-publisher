import { performance } from 'node:perf_hooks';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';

export default new AdminCommand(CommandNames.PING, async ({ channel }) => {
  const runs = [1, 2, 3];
  const pings: number[] = [];

  await Promise.all(
    runs.map(async (run) => {
      const start = performance.now();
      await channel.send(`Ping ${run}...`).then(() => {
        pings.push(performance.now() - start);
      });
    })
  );
  pings.sort((a, b) => a - b);

  const parseMs = (ms: number) => `${Math.ceil(ms)}ms`;

  const average = (pings[0] + pings[1] + pings[2]) / 3;
  channel.send(
    `Low: ${parseMs(pings[0])}\nMid: ${parseMs(pings[1])}\nHigh: ${parseMs(pings[2])}\nAverage: ${parseMs(average)}`
  );
});
