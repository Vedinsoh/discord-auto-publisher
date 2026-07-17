import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatUsd, PREMIUM_YEARLY_PER_MONTH_USD } from '@/lib/pricing';

/**
 * Slim, soft pricing pointer on the homepage — replaces the old full pricing
 * block (moved to /premium). Free-first framing, no wall of price cards.
 */
export function PricingTeaser() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-3xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-8 sm:px-10 sm:flex sm:items-center sm:justify-between gap-6">
        <div className="mb-4 sm:mb-0">
          <h2 className="text-white text-xl font-semibold mb-1">Free to start</h2>
          <p className="text-slate-400">
            Publish in up to 3 channels for free. Premium from{' '}
            <span className="text-white font-medium">
              {formatUsd(PREMIUM_YEARLY_PER_MONTH_USD)}/month
            </span>
            .
          </p>
        </div>
        <Link
          href="/premium"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium shrink-0 group"
        >
          View plans
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </section>
  );
}
