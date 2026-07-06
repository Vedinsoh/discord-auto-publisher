'use client';

import { Hash, Hourglass, Loader2, Megaphone, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { LegacyMigrateModal } from '@/components/dashboard/legacy-migrate-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { disableChannel, enableChannel } from '@/lib/api/actions';
import type { GuildChannel } from '@/lib/api/types';

interface ChannelConfigProps {
  guildId: string;
  channels: GuildChannel[];
  hasSubscription: boolean;
  /** Max enabled channels for the guild's managing edition; 0 = unlimited */
  channelLimit: number;
  /** MIGRATION: false = legacy guild. Removed at sunset. */
  migrated: boolean;
  /** Premium handover pending: free bot still publishes until the premium bot's permissions pass */
  premiumPending: boolean;
}

/** Banner shown while the premium bot waits for permissions before taking over */
function PremiumPendingBanner({ channels }: { channels: GuildChannel[] }) {
  const blockedCount = channels.filter(c => c.premiumBotHasPermissions === false).length;

  return (
    <Card className="bg-purple-500/10 border-purple-500/30 p-6">
      <div className="flex items-start gap-4">
        <Hourglass className="w-6 h-6 text-purple-400 shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-white text-lg mb-1">Premium bot is waiting to take over</h3>
          <p className="text-slate-300 text-sm">
            The free bot keeps publishing until the Premium bot can publish in every configured
            channel — permissions don&apos;t transfer between bots.{' '}
            {blockedCount > 0
              ? `Grant the Premium bot access to the ${blockedCount} flagged channel${blockedCount !== 1 ? 's' : ''} below to complete the switch.`
              : 'The switch completes automatically within moments.'}
          </p>
        </div>
      </div>
    </Card>
  );
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
 * MIGRATION: Legacy-guild view — banner + disabled toggles + migrate modal.
 * Remove after migration period (6 months).
 */
function LegacyChannelView({
  guildId,
  channels,
  channelLimit,
  premiumPending,
}: {
  guildId: string;
  channels: GuildChannel[];
  channelLimit: number;
  premiumPending: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const limit = channelLimit === 0 ? null : channelLimit;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-white mb-2">Channel Configuration</h2>
        <p className="text-slate-400">Manage Auto Publisher for your announcement channels</p>
      </div>

      {premiumPending && <PremiumPendingBanner channels={channels} />}

      <Card className="bg-amber-500/10 border-amber-500/30 p-6">
        <div className="flex items-start gap-4">
          <Megaphone className="w-6 h-6 text-amber-400 shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-white text-lg mb-1">This server runs in legacy mode</h3>
            <p className="text-slate-300 text-sm mb-4">
              Every announcement channel is published automatically. Switch to the new system to
              choose exactly which channels publish and unlock filters.
            </p>
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950"
            >
              Migrate now
            </Button>
          </div>
        </div>
      </Card>

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

      {modalOpen && (
        <LegacyMigrateModal
          guildId={guildId}
          channels={channels}
          limit={limit}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

export function ChannelConfig({
  guildId,
  channels,
  hasSubscription,
  channelLimit,
  migrated,
  premiumPending,
}: ChannelConfigProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // MIGRATION: hooks above must run unconditionally; early return only after
  if (!migrated) {
    return (
      <LegacyChannelView
        guildId={guildId}
        channels={channels}
        channelLimit={channelLimit}
        premiumPending={premiumPending}
      />
    );
  }

  const handleToggleChannel = (channelId: string, enabled: boolean) => {
    startTransition(async () => {
      try {
        if (enabled) {
          await disableChannel(guildId, channelId);
        } else {
          await enableChannel(guildId, channelId);
        }
      } finally {
        router.refresh();
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

      {premiumPending && <PremiumPendingBanner channels={channels} />}

      <div className="space-y-3">
        {enabledChannels.map(channel => (
          <Card key={channel.channelId} className="bg-slate-900/50 border-slate-800 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Hash className="w-5 h-5 text-slate-500" />
                <span className="text-white text-lg">{channel.name}</span>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
                {channel.filters.length > 0 && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {channel.filters.length} filter
                    {channel.filters.length !== 1 && 's'}
                  </Badge>
                )}
                <PremiumBlockedBadge channel={channel} />
              </div>
              <div className="flex items-center gap-2">
                {isPending && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
                <Switch
                  checked={true}
                  disabled={isPending}
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
                {isPending && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
                <Switch
                  checked={false}
                  disabled={isPending}
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
    </div>
  );
}
