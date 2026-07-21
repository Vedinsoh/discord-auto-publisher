import { ArrowRight, Check, Crown } from 'lucide-react';
import Link from 'next/link';
import { FREE_PLAN_FEATURES, PREMIUM_PLAN_FEATURES } from '@/lib/plans';

export function PlanComparison() {
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Free vs Premium</h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Start free in up to 3 channels. Upgrade to Premium for unlimited channels and advanced
          controls.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
          <h3 className="mb-4 text-lg font-semibold text-white">Free</h3>
          <ul className="space-y-3">
            {FREE_PLAN_FEATURES.map(feature => (
              <li key={feature} className="flex items-start gap-3 text-slate-300">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-blue-500/30 bg-slate-900/50 p-6 backdrop-blur-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Crown className="h-5 w-5 text-amber-300" />
            Premium
          </h3>
          <ul className="space-y-3">
            {PREMIUM_PLAN_FEATURES.map(feature => (
              <li key={feature} className="flex items-start gap-3 text-slate-300">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/premium"
            className="mt-6 inline-flex items-center gap-2 font-medium text-blue-400 transition-colors hover:text-blue-300 group"
          >
            View plans
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
