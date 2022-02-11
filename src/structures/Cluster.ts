import { Client, client } from 'discord-hybrid-sharding';
import SpamManager from '#modules/SpamManager';

export class AutoPublisherCluster extends Client {
  spam = new SpamManager();

  constructor(options: client) {
    super(options);
  }
}
