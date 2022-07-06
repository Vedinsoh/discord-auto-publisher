import { Client, client } from 'discord-hybrid-sharding';
import SpamManager from '#modules/SpamManager';

export class AutoPublisherCluster extends Client {
  spamChannels = new SpamManager();

  constructor(options: client) {
    super(options);
  }
}
