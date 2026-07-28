export const links = {
  discordSupportServer: 'https://discord.gg/xcEeJkdQX8',
  supportEmail: 'support@auto-publisher.gg',
  githubRepo: 'https://github.com/Vedinsoh/discord-auto-publisher',
  githubAuthor: 'https://github.com/Vedinsoh',
};

export const values = {
  activeServers: 17000,
  messagesPublished: 100_000_000,
};

// MIGRATION: date legacy mode stops working. Shown across all legacy surfaces.
// TODO(migration): replace with the real legacy sunset date before v7 launch. Placeholder only.
export const LEGACY_SUNSET_DATE = '2026-12-31';

/** Human-readable sunset date, deterministic across server/client (fixed en-US + UTC). */
export function legacySunsetLabel(): string {
  return new Date(`${LEGACY_SUNSET_DATE}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
