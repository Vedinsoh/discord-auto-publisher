import DHS, { client as DiscordClient } from 'discord-hybrid-sharding';

const { Client: ClusterClient } = DHS;

class AutoPublisherCluster extends ClusterClient {
  constructor(options: DiscordClient) {
    super(options);
  }
}

export default AutoPublisherCluster;
