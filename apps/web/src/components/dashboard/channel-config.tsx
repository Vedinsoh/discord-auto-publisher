'use client';

import { Loader2, Megaphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ChannelFixButton, channelStatusStyle } from '@/components/dashboard/channel-fix';
import {
  ChannelLimitModal,
  channelLimitReasonFromGuild,
} from '@/components/dashboard/channel-limit-upsell';
import { PublishLimitNote } from '@/components/dashboard/publish-limit-note';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { disableChannel, enableChannel } from '@/lib/api/actions';
import type { ChannelLimitReason, GuildChannel } from '@/lib/api/types';

interface ChannelConfigProps {
  guildId: string;
  channels: GuildChannel[];
  hasSubscription: boolean;
  premiumBotPresent: boolean;
  premiumPending: boolean;
  /** Max enabled channels for the guild's managing edition; 0 = unlimited */
  channelLimit: number;
  /** MIGRATION: false = legacy guild. Removed at sunset. */
  migrated: boolean;
}

/**
 * MIGRATION: Legacy-guild view — read-only channel list with disabled toggles.
 * The legacy-mode banner + migrate modal live in the shell's banner stack
 * (dashboard-banners.tsx). Remove after migration period (6 months).
 */
function LegacyChannelView({ channels }: { channels: GuildChannel[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-white mb-2">Channel Configuration</h2>
        <p className="text-slate-400 mb-3">Manage Auto Publisher for your announcement channels</p>
        <PublishLimitNote />
      </div>

      <div className="space-y-3">
        {channels.map(channel => (
          <Card key={channel.channelId} className="bg-slate-900/30 border-slate-800/50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Megaphone className="w-5 h-5 text-slate-500" />
                <span className="text-slate-300 text-lg">{channel.name}</span>
                {channel.canPublish ? (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    Auto (legacy)
                  </Badge>
                ) : (
                  <Badge className="bg-slate-800/50 text-slate-500 border-slate-700">
                    Missing permissions
                  </Badge>
                )}
              </div>
              <Switch checked={!!channel.canPublish} disabled />
            </div>
          </Card>
        ))}
      </div>

      {channels.length === 0 && (
        <Card className="bg-slate-900/50 border-slate-800 p-12 text-center">
          <Megaphone className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No announcement channels</p>
          <p className="text-slate-500 text-sm">
            This server doesn&apos;t have any announcement channels
          </p>
        </Card>
      )}
    </div>
  );
}

export function ChannelConfig({
  guildId,
  channels,
  hasSubscription,
  premiumBotPresent,
  premiumPending,
  channelLimit,
  migrated,
}: ChannelConfigProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingChannelId, setPendingChannelId] = useState<string | null>(null);
  const [limitReason, setLimitReason] = useState<ChannelLimitReason | null>(null);

  // MIGRATION: hooks above must run unconditionally; early return only after
  if (!migrated) {
    return <LegacyChannelView channels={channels} />;
  }

  const handleToggleChannel = (channelId: string, enabled: boolean) => {
    setPendingChannelId(channelId);
    startTransition(async () => {
      try {
        if (enabled) {
          await disableChannel(guildId, channelId);
          router.refresh();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        const result = await enableChannel(guildId, channelId);
        if (result.ok) {
          router.refresh();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        // Cap hit: show the reason-appropriate upsell instead of a hard failure.
        // Prefer the backend's code; fall back to the client mirror if absent.
        setLimitReason(
          result.code ??
            channelLimitReasonFromGuild({ hasSubscription, premiumBotPresent, premiumPending })
        );
      } finally {
        setPendingChannelId(null);
      }
    });
  };

  const enabledChannels = channels.filter(c => c.enabled);
  const disabledChannels = channels.filter(c => !c.enabled);

  const renderEnabledCard = (channel: GuildChannel) => {
    const style = channelStatusStyle(channel);
    return (
      <Card key={channel.channelId} className={`${style.card} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className={`w-5 h-5 ${style.icon}`} />
            <span className="text-white text-md">{channel.name}</span>
            {channel.filters.length > 0 && (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                {channel.filters.length} filter
                {channel.filters.length !== 1 && 's'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ChannelFixButton channel={channel} />
            {isPending && pendingChannelId === channel.channelId && (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            )}
            <Switch
              checked={true}
              disabled={isPending && pendingChannelId === channel.channelId}
              onCheckedChange={() => handleToggleChannel(channel.channelId, true)}
            />
          </div>
        </div>
      </Card>
    );
  };

  const renderDisabledCard = (channel: GuildChannel) => (
    <Card key={channel.channelId} className="bg-slate-900/30 border-slate-800/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-slate-600" />
          <span className="text-slate-400 text-md">{channel.name}</span>
          {/* Retained config from an over-limit pause (ADR 0009) — subtle, not a managed state */}
          {channel.hasSavedSetup && (
            <Badge className="bg-slate-800/50 text-slate-500 border-slate-700">Saved setup</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isPending && pendingChannelId === channel.channelId && (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          )}
          <Switch
            checked={false}
            disabled={isPending && pendingChannelId === channel.channelId}
            onCheckedChange={() => handleToggleChannel(channel.channelId, false)}
          />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-white mb-2">Channel Configuration</h2>
        <p className="text-slate-400 mb-3">
          Manage Auto Publisher for your announcement channels
          {!hasSubscription && channelLimit !== 0 && ` (Free plan: up to ${channelLimit} channels)`}
        </p>
        <PublishLimitNote />
      </div>

      {channels.length > 0 && (
        <div className="grid md:grid-cols-2 md:divide-x divide-slate-800 gap-6 md:gap-0">
          <div className="space-y-3 md:pr-6 order-2 md:order-1">
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Disabled<span className="ml-3 text-slate-600">{disabledChannels.length}</span>
            </h3>
            {disabledChannels.length > 0 ? (
              <div className="space-y-3">{disabledChannels.map(renderDisabledCard)}</div>
            ) : (
              <p className="text-slate-600 text-sm py-4">No disabled channels</p>
            )}
          </div>
          <div className="space-y-3 md:pl-6 order-1 md:order-2">
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Enabled<span className="ml-3 text-slate-600">{enabledChannels.length}</span>
            </h3>
            {enabledChannels.length > 0 ? (
              <div className="space-y-3">{enabledChannels.map(renderEnabledCard)}</div>
            ) : (
              <p className="text-slate-600 text-sm py-4">No enabled channels</p>
            )}
          </div>
        </div>
      )}

      {channels.length === 0 && (
        <Card className="bg-slate-900/50 border-slate-800 p-12 text-center">
          <Megaphone className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No announcement channels</p>
          <p className="text-slate-500 text-sm">
            This server doesn&apos;t have any announcement channels
          </p>
        </Card>
      )}

      {limitReason && (
        <ChannelLimitModal
          reason={limitReason}
          guildId={guildId}
          onClose={() => setLimitReason(null)}
        />
      )}
    </div>
  );
}
