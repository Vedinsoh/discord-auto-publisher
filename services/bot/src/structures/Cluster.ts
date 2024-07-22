import { ClusterClient, type DjsDiscordClient } from 'discord-hybrid-sharding';
import { createLogger } from '#util/logger';

class AutoPublisherCluster extends ClusterClient<DjsDiscordClient> {
  public logger = createLogger(`CLUSTER ${this.id}`);

  constructor(options: DjsDiscordClient) {
    super(options);
  }
}

export default AutoPublisherCluster;
