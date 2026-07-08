'use client';

import { ChannelConfig } from '@/components/dashboard/channel-config';
import { useGuild } from '@/components/dashboard/guild-context';

export default function ChannelsPage() {
  const { guild, data } = useGuild();

  return (
    <ChannelConfig
      guildId={guild.id}
      channels={data.channels}
      hasSubscription={guild.hasSubscription}
      premiumBotPresent={guild.premiumBotPresent}
      premiumPending={data.premiumPending}
      channelLimit={data.channelLimit}
      migrated={data.migrated}
    />
  );
}
