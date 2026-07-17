import { ArrowRight, Check, Crown } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PREMIUM_PLAN_FEATURES } from '@/lib/plans';
import {
  formatUsd,
  PREMIUM_PRICE_MONTHLY_USD,
  PREMIUM_PRICE_YEARLY_USD,
  PREMIUM_YEARLY_PER_MONTH_USD,
  PREMIUM_YEARLY_SAVINGS_PERCENT,
} from '@/lib/pricing';

/**
 * The public /premium pricing: the two Premium billing options, Monthly and
 * Annual. Annual is the highlighted "Most Popular" plan (lower per-month price
 * + save badge). Neither CTA checks out — checkout is guild-scoped, so both
 * funnel into /dashboard?upgrade=<interval>: the flag's presence routes a free
 * guild straight to its subscription tab, and the value (month|year) preselects
 * that interval there.
 */
export function PricingPlans() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">
      {/* Monthly */}
      <Card className="bg-slate-900/50 border-blue-600/40 p-8 flex flex-col">
        <div className="mb-6">
          <h3 className="text-white text-xl font-semibold mb-2">Monthly</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">
              {formatUsd(PREMIUM_PRICE_MONTHLY_USD)}
            </span>
            <span className="text-slate-400">/month</span>
          </div>
          <p className="text-slate-400 text-sm mt-2">Billed monthly. Cancel anytime.</p>
        </div>

        <ul className="space-y-3 mb-8 flex-1">
          {PREMIUM_PLAN_FEATURES.map(feature => (
            <li key={feature} className="flex items-start gap-3 text-slate-300">
              <div className="w-5 h-5 bg-slate-700/50 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-slate-300" />
              </div>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          size="lg"
          variant="outline"
          className="w-full bg-linear-to-r from-blue-900 to-blue-800 hover:from-blue-800 hover:to-blue-700 text-white border-0 group"
          asChild
        >
          <Link href="/dashboard?upgrade=month">Choose Monthly</Link>
        </Button>
      </Card>

      {/* Annual — Best Value */}
      <div className="relative">
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 text-xs font-semibold bg-linear-to-r from-blue-500 to-blue-600 text-white px-4 py-1 rounded-full shadow-lg shadow-blue-500/30 whitespace-nowrap">
          Best Value
        </span>
        <div className="absolute inset-0 bg-linear-to-r from-blue-500/20 to-purple-500/20 blur-3xl" />
        <Card className="relative bg-linear-to-br from-blue-500/10 to-purple-500/10 border-blue-500/40 p-8 flex flex-col h-full">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                <h3 className="text-white text-xl font-semibold">Annual</h3>
              </div>
              <span className="text-xs font-semibold bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full">
                Save {PREMIUM_YEARLY_SAVINGS_PERCENT}%
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-white">
                {formatUsd(PREMIUM_YEARLY_PER_MONTH_USD)}
              </span>
              <span className="text-slate-400">/month</span>
            </div>
            <p className="text-slate-400 text-sm mt-2">
              Billed annually at {formatUsd(PREMIUM_PRICE_YEARLY_USD)}. Cancel anytime.
            </p>
          </div>

          <ul className="space-y-3 mb-8 flex-1">
            {PREMIUM_PLAN_FEATURES.map(feature => (
              <li key={feature} className="flex items-start gap-3 text-slate-300">
                <div className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-blue-400" />
                </div>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            size="lg"
            className="w-full bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 group"
            asChild
          >
            <Link href="/dashboard?upgrade=year">
              Choose Annual
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
