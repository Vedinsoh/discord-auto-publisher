import { ClusterClient, type DjsDiscordClient } from 'discord-hybrid-sharding';
import AntiSpamManager from '#managers/AntiSpamManager';
import BlacklistManager from '#managers/BlacklistManager';
import CrosspostsManager from '#managers/CrosspostsManager';
import QueueManager from '#managers/QueueManager';
import RequestLimitManager from '#managers/RequestLimitManager';
import { createLogger } from '#util/logger';

class AutoPublisherCluster extends ClusterClient<DjsDiscordClient> {
  public logger = createLogger(`CLUSTER ${this.id}`);

  public blacklist = new BlacklistManager();
  public antiSpam = new AntiSpamManager();
  public crosspostQueue = new QueueManager();

  public cache = {
    requestLimits: new RequestLimitManager(),
    crossposts: new CrosspostsManager(),
  };

  constructor(options: DjsDiscordClient) {
    super(options);
  }
}

export default AutoPublisherCluster;
