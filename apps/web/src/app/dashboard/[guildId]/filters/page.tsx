'use client';

import { FilterManager } from '@/components/dashboard/filter-config';
import { useGuild } from '@/components/dashboard/guild-context';
import { LockedFeature } from '@/components/dashboard/locked-feature';

export default function FiltersPage() {
  const { guild, data } = useGuild();
  const isPremium = guild.premiumBotPresent || guild.hasSubscription;

  // Filters only take effect while the Premium bot is actively managing the
  // guild (present AND handover complete); otherwise the manager renders
  // read-only with a nudge. Enforced server-side too (PREMIUM_INACTIVE).
  const isActive = guild.premiumBotPresent && !guild.premiumPending;

  // Header is rendered at the page level so the "Channel Filters" title shows
  // in both the free (upsell) and premium (manager) states, mirroring the
  // subscription page's always-on section title.
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl text-white">Channel Filters</h2>
        <p className="text-slate-400">
          Choose exactly which messages auto-publish from each channel.
        </p>
      </div>

      {isPremium ? (
        <FilterManager
          guildId={guild.id}
          channels={data.channels}
          isActive={isActive}
          hasSubscription={guild.hasSubscription}
          premiumBotPresent={guild.premiumBotPresent}
          premiumPending={guild.premiumPending}
        />
      ) : (
        <div className="mx-auto max-w-md">
          <LockedFeature
            guildId={guild.id}
            description="Control exactly which messages get published from each channel"
            benefits={[
              'Filter by keyword, mention, author, or webhook',
              'Allow or block mode per rule',
              'Combine rules with any/all matching',
              'Manage everything from the dashboard',
            ]}
          />
        </div>
      )}
    </div>
  );
}
