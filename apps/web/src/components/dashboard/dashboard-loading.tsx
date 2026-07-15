'use client';

import { usePathname } from 'next/navigation';
import { GuildDashboardShellSkeleton, ServerSelectorSkeleton } from './skeletons';

/**
 * Fallback for the guild-list fetch in `dashboard/layout`. Picks the skeleton
 * that matches the route being loaded — the guild shell for `/dashboard/:id/*`,
 * the server-list grid for `/dashboard` — so the initial load never shows a
 * blank while the list resolves. Only shown on the first dashboard entry / hard
 * load; `router.refresh()` re-runs the fetch in a transition, so it doesn't
 * re-trigger this fallback (the switcher stays put).
 */
export function DashboardLoadingSkeleton() {
  const pathname = usePathname();
  const isGuildRoute = /^\/dashboard\/[^/]+/.test(pathname);
  return isGuildRoute ? <GuildDashboardShellSkeleton /> : <ServerSelectorSkeleton />;
}
