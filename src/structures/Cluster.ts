import { ClusterClient, type DjsDiscordClient } from 'discord-hybrid-sharding';

class AutoPublisherCluster extends ClusterClient<DjsDiscordClient> {
  constructor(options: DjsDiscordClient) {
    super(options);
  }
}

export default AutoPublisherCluster;
