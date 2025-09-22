import { SapphireClient } from '@sapphire/framework';
import { env } from 'lib/config/env.js';
import { ClusterClient } from './clusterClient.js';

export class BotClient extends SapphireClient {
  public cluster: ClusterClient = new ClusterClient(this);

  /**
   * Start the bot client shard
   */
  start() {
    this.login(env.DISCORD_TOKEN);
  }
}

declare module '@sapphire/framework' {
  interface SapphireClient {
    cluster: ClusterClient;
  }
}
