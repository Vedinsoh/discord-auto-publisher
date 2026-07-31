import { ArrowRight, Check, Crown } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PREMIUM_FEATURE_BLURBS, type PremiumFeatureKey } from '@/lib/plans';

interface LockedFeatureProps {
  guildId: string;
  feature: PremiumFeatureKey;
}

/**
 * Presentational upsell shown in place of a premium-only tab's content for a
 * free server. Not a gating wrapper — the page decides when to render it (and
 * owns the section title). Copy comes from PREMIUM_FEATURE_BLURBS so this card
 * and the Subscription page's continuity strip cannot drift apart.
 *
 * The CTA names its destination ("See Premium plans") instead of promising the
 * upgrade itself, and carries `?from={feature}` so the Subscription page opens
 * with this feature's copy rather than generic plan blurb. Both ends used to say
 * "Upgrade to Premium" and look identical, which made the navigation read as a
 * no-op — you pressed a button and landed on the same button. The one genuine
 * upgrade press lives on the Subscription page, still the sole checkout entry
 * point (never a second Paddle overlay). See CONTEXT.md "Locked premium tab".
 */
export function LockedFeature({ guildId, feature }: LockedFeatureProps) {
  const { description, benefits } = PREMIUM_FEATURE_BLURBS[feature];

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-linear-to-r from-blue-500/20 to-purple-500/20 blur-3xl" />
      <Card className="relative bg-linear-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-3xl text-white mb-2">Upgrade to Premium</h3>
          <p className="text-slate-400">{description}</p>
        </div>

        <ul className="space-y-3 mb-8 max-w-md mx-auto">
          {benefits.map(benefit => (
            <li key={benefit} className="flex items-center gap-3 text-slate-300">
              <Check className="w-5 h-5 text-blue-400 shrink-0" />
              {benefit}
            </li>
          ))}
        </ul>

        <Button
          className="w-full bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-lg py-6"
          asChild
        >
          <Link href={`/dashboard/${guildId}/subscription?from=${feature}`}>
            See Premium plans
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </Button>
      </Card>
    </div>
  );
}
