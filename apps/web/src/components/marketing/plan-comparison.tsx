import { isPublicInstance } from '@ap/config';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PlanComparisonTable } from '@/components/plan-comparison-table';
import { FREE_CHANNEL_LIMIT } from '@/lib/plans';

export function PlanComparison() {
  // A self-hosted instance has no billing: there are no tiers to compare, and
  // the "View plans" link would land on a 404'd /premium.
  if (!isPublicInstance) return null;

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Free vs Premium</h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Start free in up to {FREE_CHANNEL_LIMIT} channels. Upgrade to Premium for unlimited
          channels and advanced controls.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm sm:p-8">
        <PlanComparisonTable />
        <Link
          href="/premium"
          className="mt-6 inline-flex items-center gap-2 font-medium text-blue-400 transition-colors hover:text-blue-300 group"
        >
          View plans
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
