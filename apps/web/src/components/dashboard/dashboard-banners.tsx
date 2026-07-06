'use client';

import { Crown, ExternalLink, Hourglass, Megaphone } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useGuild } from '@/components/dashboard/guild-context';
import { LegacyMigrateModal } from '@/components/dashboard/legacy-migrate-modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { GuildChannel } from '@/lib/api/types';
import { getBotInviteUrl, PREMIUM_BOT_CLIENT_ID } from '@/lib/invite';
import { useRefreshOnReturn } from '@/lib/use-refresh-on-return';

/**
 * Guild-level banner stack rendered in the dashboard shell, above the sidebar
 * and page content. Order: premium invite → premium pending → legacy
 * migration. Invite and pending are mutually exclusive (pending implies the
 * premium bot is present); the migration banner can stack with either.
 * None are dismissible — they nag until the state resolves (ADR 0006).
 */
export function DashboardBanners() {
  const { guild, data } = useGuild();

  const showPremiumInvite = guild.hasSubscription && !guild.premiumBotPresent;
  const showPremiumPending = data.premiumPending;
  const showMigration = !data.migrated;

  if (!showPremiumInvite && !showPremiumPending && !showMigration) {
    return null;
  }

  return (
    <div className="space-y-6 mb-6">
      {showPremiumInvite && <PremiumInviteBanner guildId={guild.id} />}
      {showPremiumPending && <PremiumPendingBanner guildId={guild.id} channels={data.channels} />}
      {showMigration && (
        <LegacyMigrationBanner
          guildId={guild.id}
          channels={data.channels}
          channelLimit={data.channelLimit}
        />
      )}
    </div>
  );
}

/** Nag shown when the guild has an entitled subscription but the premium bot was never invited */
function PremiumInviteBanner({ guildId }: { guildId: string }) {
  const armRefreshOnReturn = useRefreshOnReturn();
  // Locked to the subscribed guild: the premium entitlement gate makes the
  // bot self-leave any other guild
  const inviteUrl = PREMIUM_BOT_CLIENT_ID
    ? getBotInviteUrl('premium', guildId, { lockGuildSelect: true })
    : null;

  return (
    <Card className="bg-purple-500/10 border-purple-500/30 p-6">
      <div className="flex items-start gap-4">
        <Crown className="w-6 h-6 text-purple-400 shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-white text-lg mb-1">
            Your Premium subscription isn&apos;t active on this server yet
          </h3>
          <p className="text-slate-300 text-sm mb-4">
            Invite the Premium bot to start using your subscription — your channels and settings are
            kept.
          </p>
          {inviteUrl && (
            <>
              <Button className="bg-[#5865F2] hover:bg-[#4752C4] text-white" asChild>
                <a
                  href={inviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={armRefreshOnReturn}
                >
                  Invite Premium Bot
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
              <p className="text-slate-500 text-sm mt-3">
                Bot permissions don&apos;t transfer between apps: the free bot keeps publishing
                until the Premium bot can publish in all your channels, then hands over and leaves
                automatically.
              </p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

/** Banner shown while the premium bot waits for permissions before taking over */
function PremiumPendingBanner({
  guildId,
  channels,
}: {
  guildId: string;
  channels: GuildChannel[];
}) {
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
            {blockedCount > 0 ? (
              <>
                Grant the Premium bot access to the {blockedCount} flagged channel
                {blockedCount !== 1 ? 's' : ''} in the{' '}
                <Link
                  href={`/dashboard/${guildId}/channels`}
                  className="text-blue-400 hover:underline"
                >
                  Channels tab
                </Link>{' '}
                to complete the switch.
              </>
            ) : (
              'The switch completes automatically within moments.'
            )}
          </p>
        </div>
      </div>
    </Card>
  );
}

// MIGRATION: Remove this banner after migration period (6 months)
function LegacyMigrationBanner({
  guildId,
  channels,
  channelLimit,
}: {
  guildId: string;
  channels: GuildChannel[];
  channelLimit: number;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Card className="bg-amber-500/10 border-amber-500/30 p-6">
        <div className="flex items-start gap-4">
          <Megaphone className="w-6 h-6 text-amber-400 shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-white text-lg mb-1">This server runs in legacy mode</h3>
            <p className="text-slate-300 text-sm mb-4">
              Every announcement channel is published automatically. Legacy mode will be
              discontinued in the near future, and the bot may stop publishing in this server once
              it is retired. Migrate now to keep publishing without interruption, choose exactly
              which channels publish, and unlock new features.
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
      {modalOpen && (
        <LegacyMigrateModal
          guildId={guildId}
          channels={channels}
          limit={channelLimit === 0 ? null : channelLimit}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
