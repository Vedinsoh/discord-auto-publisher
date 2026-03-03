'use client';

import { Hash, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { disableChannel, enableChannel } from '@/lib/api/actions';
import type { Edition, GuildChannel } from '@/lib/api/types';

interface ChannelConfigProps {
  edition: Edition;
  guildId: string;
  channels: GuildChannel[];
  hasSubscription: boolean;
}

export function ChannelConfig({ edition, guildId, channels, hasSubscription }: ChannelConfigProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleToggleChannel = (channelId: string, enabled: boolean) => {
    startTransition(async () => {
      try {
        if (enabled) {
          await disableChannel(edition, guildId, channelId);
        } else {
          await enableChannel(edition, guildId, channelId);
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
          {!hasSubscription && ' (Free plan: up to 3 channels)'}
        </p>
      </div>

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
