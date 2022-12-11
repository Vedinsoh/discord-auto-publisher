import { Client as ClusterClient, client as DiscordClient } from 'discord-hybrid-sharding';

class AutoPublisherCluster extends ClusterClient {
  constructor(options: DiscordClient) {
    super(options);
  }
}

export default AutoPublisherCluster;
