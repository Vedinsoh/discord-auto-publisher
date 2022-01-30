import { Client, client } from 'discord-hybrid-sharding';
import BlacklistManager from '#modules/BlacklistManager';
import SpamManager from '#modules/SpamManager';

export class AutoPublisherCluster extends Client {
  blacklist = new BlacklistManager();
  spam = new SpamManager();

  constructor(options: client) {
    super(options);
  }
}
