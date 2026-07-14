import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton for the /dashboard server selector grid */
export function ServerSelectorSkeleton() {
  return (
    <div className="min-h-screen px-4 pt-24 pb-16">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl text-white">Select a Server</h1>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <ServerCardSkeleton />
          <ServerCardSkeleton />
          <ServerCardSkeleton />
          <ServerCardSkeleton />
          <ServerCardSkeleton />
          <ServerCardSkeleton />
        </div>
      </div>
    </div>
  );
}

function ServerCardSkeleton() {
  return (
    <Card className="bg-slate-900/50 border-slate-800 py-3 px-4">
      <div className="flex items-center justify-between h-12">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl bg-slate-800 shrink-0" />
          <Skeleton className="h-5 w-36 bg-slate-800" />
        </div>
        <Skeleton className="w-6 h-6 rounded bg-slate-800 shrink-0" />
      </div>
    </Card>
  );
}

function ChannelCardSkeleton() {
  return (
    <Card className="bg-slate-900/50 border-slate-800 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-5 h-5 rounded bg-slate-800" />
          <Skeleton className="h-6 w-40 bg-slate-800" />
          <Skeleton className="h-5 w-14 rounded-full bg-slate-800" />
        </div>
        <Skeleton className="h-6 w-10 rounded-full bg-slate-800" />
      </div>
    </Card>
  );
}

/** Skeleton for channel configuration content */
export function ChannelConfigSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64 bg-slate-800 mb-2" />
        <Skeleton className="h-5 w-96 bg-slate-800" />
      </div>
      <div className="grid md:grid-cols-2 md:divide-x divide-slate-800 gap-6 md:gap-0">
        <div className="space-y-3 md:pr-6">
          <Skeleton className="h-4 w-20 bg-slate-800" />
          <ChannelCardSkeleton />
          <ChannelCardSkeleton />
        </div>
        <div className="space-y-3 md:pl-6">
          <Skeleton className="h-4 w-20 bg-slate-800" />
          <ChannelCardSkeleton />
          <ChannelCardSkeleton />
        </div>
      </div>
    </div>
  );
}

function FilterChannelSkeleton() {
  return (
    <Card className="bg-slate-900/50 border-slate-800 p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Skeleton className="w-5 h-5 rounded bg-slate-800" />
          <Skeleton className="h-6 w-32 bg-slate-800" />
          <Skeleton className="h-5 w-16 rounded-full bg-slate-800" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between py-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-14 rounded-full bg-slate-800" />
            <Skeleton className="h-5 w-20 bg-slate-800" />
          </div>
          <Skeleton className="h-5 w-24 rounded-full bg-slate-800" />
        </div>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-14 rounded-full bg-slate-800" />
            <Skeleton className="h-5 w-20 bg-slate-800" />
          </div>
          <Skeleton className="h-5 w-24 rounded-full bg-slate-800" />
        </div>
      </div>
    </Card>
  );
}

/** Skeleton for filter configuration content */
export function FilterConfigSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 bg-slate-800 mb-2" />
        <Skeleton className="h-5 w-72 bg-slate-800" />
      </div>
      <div className="space-y-4">
        <FilterChannelSkeleton />
        <FilterChannelSkeleton />
      </div>
    </div>
  );
}

/** Skeleton for subscription panel content */
export function SubscriptionPanelSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-72 bg-slate-800 mb-2" />
        <Skeleton className="h-5 w-80 bg-slate-800" />
      </div>
      <Card className="bg-slate-900/50 border-slate-800 p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="w-12 h-12 rounded-lg bg-slate-800 shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-52 bg-slate-800" />
            <Skeleton className="h-5 w-80 bg-slate-800" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-40 bg-slate-800" />
              <Skeleton className="h-4 w-36 bg-slate-800" />
              <Skeleton className="h-4 w-32 bg-slate-800" />
            </div>
          </div>
        </div>
      </Card>
      <Card className="bg-slate-900/50 border-slate-800 p-8">
        <div className="text-center space-y-4">
          <Skeleton className="w-16 h-16 rounded-xl bg-slate-800 mx-auto" />
          <Skeleton className="h-8 w-56 bg-slate-800 mx-auto" />
          <Skeleton className="h-5 w-64 bg-slate-800 mx-auto" />
          <Skeleton className="h-12 w-40 bg-slate-800 mx-auto" />
        </div>
      </Card>
    </div>
  );
}

/** Skeleton for the guild dashboard shell (header + sidebar + content) */
export function GuildDashboardShellSkeleton() {
  return (
    <div className="min-h-screen px-4 pt-24 pb-16">
      <div className="max-w-6xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Skeleton className="h-4 w-28 bg-slate-800 mb-2" />
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-lg bg-slate-800" />
                <Skeleton className="h-9 w-48 bg-slate-800" />
              </div>
            </div>
            <Skeleton className="h-10 w-10 rounded-full bg-slate-800" />
          </div>
        </div>
        {/* Grid skeleton */}
        <div className="grid lg:grid-cols-[250px_1fr] gap-6">
          {/* Sidebar */}
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-lg bg-slate-800" />
            <Skeleton className="h-12 w-full rounded-lg bg-slate-800" />
            <Skeleton className="h-12 w-full rounded-lg bg-slate-800" />
          </div>
          {/* Content */}
          <div>
            <ChannelConfigSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
