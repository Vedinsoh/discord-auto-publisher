import { ClusterClient as BaseClusterClient } from 'discord-hybrid-sharding';
import type { BotClient } from './client.js';

export class ClusterClient extends BaseClusterClient<BotClient> {}
