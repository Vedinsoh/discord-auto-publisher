import {
  ClusterManager as BaseClusterManager,
  type Cluster,
  type ClusterManagerOptions,
} from 'discord-hybrid-sharding';
import { getFilePaths } from '#utils/fileUtils';
import { logger } from '#utils/logger';

const RESPAWN_BACKOFF_MS = [5_000, 30_000, 60_000, 300_000, 600_000];
const FAILURE_RESET_MS = 600_000;
const RESPAWN_TIMEOUT_MS = 120_000;

export class ClusterManager extends BaseClusterManager {
  private failures = new Map<number, { count: number; lastFailure: number }>();

  constructor(options: ClusterManagerOptions) {
    const clientFilePath = getFilePaths('shard.js')[0];
    // Disable native auto-respawn — we manage respawn manually with backoff to avoid
    // burning Discord's invalid-request budget (10k/10min CF ban) during sustained failures.
    super(clientFilePath, { ...options, respawn: false });
  }

  public start() {
    this._registerEvents();
    this.spawn({ timeout: -1 }) //
      .then(() => {
        logger.info('Clustering complete!');
      });
  }

  private _registerEvents() {
    this.on('debug', (value) => logger.debug(value));
    this.on('clusterCreate', (cluster: Cluster) => {
      cluster.on('death', () => this._scheduleRespawn(cluster));
    });
  }

  private _scheduleRespawn(cluster: Cluster) {
    const now = Date.now();
    const state = this.failures.get(cluster.id) ?? { count: 0, lastFailure: 0 };
    if (now - state.lastFailure > FAILURE_RESET_MS) state.count = 0;
    const delay = RESPAWN_BACKOFF_MS[Math.min(state.count, RESPAWN_BACKOFF_MS.length - 1)];
    state.count += 1;
    state.lastFailure = now;
    this.failures.set(cluster.id, state);

    logger.warn(
      { event: 'cluster.respawn_scheduled', clusterId: cluster.id, failureCount: state.count, delayMs: delay },
      `Cluster ${cluster.id} died (failure #${state.count}); respawning in ${delay / 1_000}s`,
    );

    setTimeout(() => {
      cluster.spawn(RESPAWN_TIMEOUT_MS).catch((err) =>
        logger.error({ event: 'cluster.respawn_failed', clusterId: cluster.id, err }),
      );
    }, delay);
  }
}

process.on('unhandledRejection', ({ stack }: Error) => logger.error(stack));
