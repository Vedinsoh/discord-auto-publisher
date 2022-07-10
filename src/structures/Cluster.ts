import { Client as ClusterClient, client as DiscordClient } from 'discord-hybrid-sharding';
import SpamManager from '#modules/SpamManager';

export class AutoPublisherCluster extends ClusterClient {
  spamChannels = new SpamManager();

  constructor(options: DiscordClient) {
    super(options);
  }
}
