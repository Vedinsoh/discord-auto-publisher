'use client';

import { FilterConfig } from '@/components/dashboard/filter-config';
import { useGuild } from '@/components/dashboard/guild-context';
import { LockedFeature } from '@/components/dashboard/locked-feature';

export default function FiltersPage() {
  const { guild, data } = useGuild();
  const isPremium = guild.premiumBotPresent || guild.hasSubscription;

  if (!isPremium) {
    return (
      <LockedFeature
        guildId={guild.id}
        title="Channel Filters"
        description="Control exactly which messages get published from each channel"
        benefits={[
          'Filter by keyword, mention, author, or webhook',
          'Allow or block mode per rule',
          'Combine rules with any/all matching',
          'Configure directly from bot commands',
        ]}
      />
    );
  }

  return <FilterConfig channels={data.channels} />;
}
