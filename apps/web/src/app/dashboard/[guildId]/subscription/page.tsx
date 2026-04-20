'use client';

import { useSearchParams } from 'next/navigation';
import { useGuild } from '@/components/dashboard/guild-context';
import { SubscriptionPanel } from '@/components/dashboard/subscription-panel';

export default function SubscriptionPage() {
  const { guild, data, edition } = useGuild();
  const searchParams = useSearchParams();
  const checkoutSuccess = searchParams.get('success') === 'true';

  return (
    <SubscriptionPanel
      edition={edition}
      guildId={guild.id}
      guildName={guild.name}
      subscription={data.subscription}
      premiumBotPresent={guild.premiumBotPresent}
      checkoutSuccess={checkoutSuccess}
    />
  );
}
