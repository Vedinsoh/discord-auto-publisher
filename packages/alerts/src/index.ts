import { env } from '@ap/config';
import type { Logger } from '@ap/logger';
import { Keys, type RedisClient } from '@ap/redis';

/** Same alert key is suppressed for 30 minutes (cross-process, restart-proof) */
const THROTTLE_TTL_SECONDS = 30 * 60;

const EMBED_COLOR = 0xed4245;

export type Alert = {
  title: string;
  description: string;
};

export type Alerter = {
  /**
   * Fire-and-forget: throttles per key via Redis, posts a minimal embed to the
   * alert webhook. Never throws — failures are logged and dropped.
   */
  send(key: string, alert: Alert): void;
};

export const createAlerter = (options: {
  redis: RedisClient;
  service: string;
  /** Edition suffix for the footer (per-edition apps only; backend omits it) */
  edition?: string;
  logger?: Logger;
}): Alerter => {
  const { redis, service, edition, logger } = options;
  const footerText = edition ? `${service} · ${edition}` : service;
  const webhookUrl = env.ALERT_WEBHOOK_URL;

  if (!webhookUrl) {
    logger?.info({ event: 'alerts.disabled' }, 'ALERT_WEBHOOK_URL not set, alerts are disabled');
  }

  return {
    send: (key, alert) => {
      if (!webhookUrl) return;

      void (async () => {
        const claimed = await redis.set(
          `${Keys.Alert}:${key}`,
          '1',
          'EX',
          THROTTLE_TTL_SECONDS,
          'NX'
        );
        if (claimed === null) return; // throttled

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [
              {
                title: alert.title,
                description: alert.description,
                color: EMBED_COLOR,
                timestamp: new Date().toISOString(),
                footer: { text: footerText },
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Alert webhook responded with ${response.status}`);
        }
      })().catch((error: unknown) => {
        logger?.warn({ event: 'alerts.send_failed', key, err: error }, 'Failed to send alert');
      });
    },
  };
};
