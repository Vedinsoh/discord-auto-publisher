'use client';

import { ChannelStatus } from '@/components/dashboard/channel-status';
import { DashboardBanners } from '@/components/dashboard/dashboard-banners';

/**
 * Guild Overview — the dashboard's attention surface and default landing tab.
 * Hosts the guild-scoped banner stack (moved off the shell) above a read-only
 * channel-status section. Its children read guild detail via useGuild(), which
 * suspends on the streamed detail promise inside the shell's content Suspense
 * (ADR 0007, 2026-07-15). See CONTEXT "Guild Overview tab".
 */
export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <DashboardBanners />
      <ChannelStatus />
    </div>
  );
}
