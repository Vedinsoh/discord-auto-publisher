import client from '#client';
import { Guild } from 'discord.js-light';

export default async (guildId: string): Promise<Guild | undefined> => {
  return new Promise((resolve) => {
    resolve(client.cluster.fetchClientValues(`guilds.cache.get('${guildId}')`) as unknown as Guild);
  });
  /*
  return new Promise((resolve) => {
    client.cluster.broadcastEval((cluster) => { // TODO
      return resolve(cluster.client.guilds.cache.get(guildId));
    });
  });
  */
};
