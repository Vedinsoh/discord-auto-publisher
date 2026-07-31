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
        // Left-aligned max-w-2xl to match the Subscription page's entitled card:
        // the upsell now carries a rule-editor preview, which a max-w-md column
        // squeezed into wrapping nonsense.
        <div className="max-w-2xl">
          {/* Copy lives in PREMIUM_FEATURE_BLURBS.filters, keyed by this tab's
              own segment. */}
          <LockedFeature guildId={guild.id} feature="filters" />
        </div>
      )}
    </div>
  );
}
