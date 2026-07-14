'use client';

import { CheckCircle2, Megaphone, PauseCircle, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useGuild } from '@/components/dashboard/guild-context';
import { PublishLimitNote } from '@/components/dashboard/publish-limit-note';
import { useGuildAttention } from '@/components/dashboard/use-guild-attention';
import { Card } from '@/components/ui/card';
import type { GuildChannel } from '@/lib/api/types';

/**
 * Read-only channel status on the Overview tab. Permission-derived from the
 * publish-state cache (ADR 0008) — no publish-activity feed or rate-limit
 * counters are plumbed to the web. Acting on channels stays on the Channels tab;
 * flagged rows link there. Migrated guilds get an itemized list; legacy guilds
 * get a minimal summary (the prominent migrate banner above steers them to
 * migrate before per-channel detail). See CONTEXT "Guild Overview tab".
 */
export function ChannelStatus() {
  const { guild, data } = useGuild();
  return data.migrated ? (
    <MigratedStatus guildId={guild.id} channels={data.channels} />
  ) : (
    <LegacyStatus channels={data.channels} />
  );
}

function MigratedStatus({ guildId, channels }: { guildId: string; channels: GuildChannel[] }) {
  const { needsFixingCount, badgeCount } = useGuildAttention();

  const enabled = channels.filter(c => c.enabled);
  // canPublish === false is the only "broken" state; undefined = unknown, treated
  // as publishing (mirrors the Channels tab's NotPublishingBadge condition).
  const blocked = enabled.filter(c => c.canPublish === false);
  const publishing = enabled.filter(c => c.canPublish !== false);
  const paused = channels.filter(c => c.hasSavedSetup);

  // Positive hero only when nothing anywhere needs attention (no banners, no
  // channel fixes) — scoped to the healthy state, not just channel permissions.
  const allClear = badgeCount === 0 && enabled.length > 0;

  return (
    <div className="space-y-6">
      {allClear ? (
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-7 h-7 text-green-500 shrink-0" />
          <div>
            <h2 className="text-2xl text-white">All good</h2>
            <p className="text-slate-400">
              Publishing in {enabled.length} channel{enabled.length !== 1 && 's'}
            </p>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-2xl text-white mb-2">Channel status</h2>
          <p className="text-slate-400">
            {needsFixingCount > 0
              ? `${needsFixingCount} channel${needsFixingCount !== 1 ? 's need' : ' needs'} attention`
              : `Publishing in ${enabled.length} channel${enabled.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      )}

      <PublishLimitNote />

      {enabled.length === 0 && paused.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-800 p-12 text-center">
          <Megaphone className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No channels are publishing yet</p>
          <p className="text-slate-500 text-sm">
            Enable an announcement channel in the{' '}
            <Link href={`/dashboard/${guildId}/channels`} className="text-blue-400 hover:underline">
              Channels tab
            </Link>{' '}
            to start auto-publishing.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Problems first, then healthy, then retained/paused config. */}
          {blocked.map(channel => (
            <BlockedRow key={channel.channelId} channel={channel} guildId={guildId} />
          ))}
          {publishing.map(channel => (
            <PublishingRow key={channel.channelId} channel={channel} />
          ))}
          {paused.map(channel => (
            <PausedRow key={channel.channelId} channel={channel} />
          ))}
        </div>
      )}
    </div>
  );
}

function PublishingRow({ channel }: { channel: GuildChannel }) {
  return (
    <Card className="bg-green-500/2 border-green-500/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Megaphone className="w-5 h-5 text-green-500 shrink-0" />
          <span className="text-white text-md truncate">{channel.name}</span>
        </div>
        <span className="text-green-500/80 text-sm shrink-0">Publishing</span>
      </div>
    </Card>
  );
}

function BlockedRow({ channel, guildId }: { channel: GuildChannel; guildId: string }) {
  const missing = channel.missingPermissions ?? [];
  return (
    <Card className="bg-red-500/5 border-red-500/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TriangleAlert className="w-5 h-5 text-red-400 shrink-0" />
          <span className="text-white text-md truncate">{channel.name}</span>
          <span className="text-red-400 text-sm shrink-0">
            {missing.length > 0 ? `Not publishing — needs ${missing.join(', ')}` : 'Not publishing'}
          </span>
        </div>
        <Link
          href={`/dashboard/${guildId}/channels`}
          className="text-blue-400 hover:underline text-sm shrink-0"
        >
          Fix
        </Link>
      </div>
    </Card>
  );
}

function PausedRow({ channel }: { channel: GuildChannel }) {
  return (
    <Card className="bg-slate-900/30 border-slate-800/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <PauseCircle className="w-5 h-5 text-slate-600 shrink-0" />
          <span className="text-slate-400 text-md truncate">{channel.name}</span>
        </div>
        <span className="text-slate-500 text-sm shrink-0">Paused</span>
      </div>
    </Card>
  );
}

/**
 * MIGRATION: Legacy guilds auto-publish every announcement channel — there is no
 * allowlist to itemize. Show a minimal summary; the migrate banner above does the
 * steering. Remove with the rest of the migration UX at sunset.
 */
function LegacyStatus({ channels }: { channels: GuildChannel[] }) {
  const publishing = channels.filter(c => c.canPublish !== false).length;
  const total = channels.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-white mb-2">Channel status</h2>
        <p className="text-slate-400">
          Legacy mode — every announcement channel is published automatically.
        </p>
      </div>

      <PublishLimitNote />

      <Card className="bg-slate-900/50 border-slate-800 p-6">
        {total > 0 ? (
          <p className="text-slate-300">
            Publishing in <span className="text-white">{publishing}</span> of {total} announcement
            channel{total !== 1 ? 's' : ''}.
          </p>
        ) : (
          <p className="text-slate-400">This server doesn&apos;t have any announcement channels.</p>
        )}
      </Card>
    </div>
  );
}
