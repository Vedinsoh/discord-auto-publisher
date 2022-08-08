import { Client as ClusterClient, client as DiscordClient } from 'discord-hybrid-sharding';

export class AutoPublisherCluster extends ClusterClient {
  constructor(options: DiscordClient) {
    super(options);
  }
}
