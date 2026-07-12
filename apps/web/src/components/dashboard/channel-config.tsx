'use client';

import { Hash, Loader2, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  ChannelLimitModal,
  channelLimitReasonFromGuild,
} from '@/components/dashboard/channel-limit-upsell';
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

/** Warning badge for channels the premium bot cannot publish in yet */
function PremiumBlockedBadge({ channel }: { channel: GuildChannel }) {
  if (channel.premiumBotHasPermissions !== false) return null;
  return (
    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
      <TriangleAlert className="w-3 h-3 mr-1" />
      Premium bot needs access
    </Badge>
  );
}

/**
 * Warning badge for an enabled channel where the managing bot currently lacks
 * permission to publish — so nothing is actually being crossposted there.
 */
function NotPublishingBadge({ channel }: { channel: GuildChannel }) {
  if (channel.canPublish !== false) return null;
  const missing = channel.missingPermissions ?? [];
  return (
    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
      <TriangleAlert className="w-3 h-3 mr-1" />
      {missing.length > 0 ? `Not publishing — needs ${missing.join(', ')}` : 'Not publishing'}
    </Badge>
  );
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
        <p className="text-slate-400">Manage Auto Publisher for your announcement channels</p>
      </div>

      <div className="space-y-3">
        {channels.map(channel => (
          <Card key={channel.channelId} className="bg-slate-900/30 border-slate-800/50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Hash className="w-5 h-5 text-slate-500" />
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
                <PremiumBlockedBadge channel={channel} />
              </div>
              <Switch checked={!!channel.canPublish} disabled />
            </div>
          </Card>
        ))}
      </div>

      {channels.length === 0 && (
        <Card className="bg-slate-900/50 border-slate-800 p-12 text-center">
          <Hash className="w-16 h-16 text-slate-600 mx-auto mb-4" />
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
          return;
        }

        const result = await enableChannel(guildId, channelId);
        if (result.ok) {
          router.refresh();
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-white mb-2">Channel Configuration</h2>
        <p className="text-slate-400">
          Manage Auto Publisher for your announcement channels
          {!hasSubscription && channelLimit !== 0 && ` (Free plan: up to ${channelLimit} channels)`}
        </p>
      </div>

      <div className="space-y-3">
        {enabledChannels.map(channel => (
          <Card key={channel.channelId} className="bg-slate-900/50 border-slate-800 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Hash className="w-5 h-5 text-slate-500" />
                <span className="text-white text-lg">{channel.name}</span>
                {channel.canPublish === false ? (
                  <NotPublishingBadge channel={channel} />
                ) : (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    Active
                  </Badge>
                )}
                {channel.filters.length > 0 && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {channel.filters.length} filter
                    {channel.filters.length !== 1 && 's'}
                  </Badge>
                )}
                <PremiumBlockedBadge channel={channel} />
              </div>
              <div className="flex items-center gap-2">
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
        ))}
        {disabledChannels.map(channel => (
          <Card key={channel.channelId} className="bg-slate-900/30 border-slate-800/50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Hash className="w-5 h-5 text-slate-600" />
                <span className="text-slate-400 text-lg">{channel.name}</span>
                <PremiumBlockedBadge channel={channel} />
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
        ))}
      </div>

      {channels.length === 0 && (
        <Card className="bg-slate-900/50 border-slate-800 p-12 text-center">
          <Hash className="w-16 h-16 text-slate-600 mx-auto mb-4" />
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
