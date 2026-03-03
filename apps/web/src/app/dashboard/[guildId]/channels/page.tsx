'use client';

import { ChannelConfig } from '@/components/dashboard/channel-config';
import { useGuild } from '@/components/dashboard/guild-context';

export default function ChannelsPage() {
  const { guild, data, edition } = useGuild();

  return (
    <ChannelConfig
      edition={edition}
      guildId={guild.id}
      channels={data.channels}
      hasSubscription={guild.hasSubscription}
    />
  );
}
