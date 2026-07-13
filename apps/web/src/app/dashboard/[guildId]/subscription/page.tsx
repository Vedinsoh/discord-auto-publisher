'use client';

import { useGuild } from '@/components/dashboard/guild-context';
import { SubscriptionPanel } from '@/components/dashboard/subscription-panel';

export default function SubscriptionPage() {
  const { guild, data } = useGuild();

  return (
    <SubscriptionPanel guildId={guild.id} guildName={guild.name} subscription={data.subscription} />
  );
}
