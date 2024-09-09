import { ClusterClient } from 'discord-hybrid-sharding';
import { createLogger } from '#utils/logger';
import type { Client as DiscordClient } from 'discord.js';

class AutoPublisherCluster extends ClusterClient<DiscordClient> {
  public logger = createLogger(`CLUSTER ${this.id}`);

  constructor(options: DiscordClient) {
    super(options);
  }
}

export default AutoPublisherCluster;
