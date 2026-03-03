'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FilterConfig } from '@/components/dashboard/filter-config';
import { useGuild } from '@/components/dashboard/guild-context';

export default function FiltersPage() {
  const { guild, data } = useGuild();
  const router = useRouter();
  const isPremium = guild.premiumBotPresent || guild.hasSubscription;

  useEffect(() => {
    if (!isPremium) {
      router.replace(`/dashboard/${guild.id}/channels`);
    }
  }, [isPremium, guild.id, router]);

  if (!isPremium) {
    return null;
  }

  return <FilterConfig channels={data.channels} />;
}
