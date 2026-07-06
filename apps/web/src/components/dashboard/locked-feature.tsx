import { Check, Crown } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface LockedFeatureProps {
  guildId: string;
  title: string;
  description: string;
  benefits: string[];
}

/**
 * Presentational upsell shown in place of a premium-only tab's content for a
 * free server. Not a gating wrapper — the page decides when to render it. The
 * CTA routes to the Subscription tab, the sole checkout entry point (never a
 * second Paddle overlay). See CONTEXT.md "Locked premium tab".
 */
export function LockedFeature({ guildId, title, description, benefits }: LockedFeatureProps) {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-linear-to-r from-blue-500/20 to-purple-500/20 blur-3xl" />
      <Card className="relative bg-linear-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-3xl text-white mb-2">{title}</h3>
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
          <Link href={`/dashboard/${guildId}/subscription`}>
            <Crown className="w-5 h-5 mr-2" />
            Upgrade to Premium
          </Link>
        </Button>
      </Card>
    </div>
  );
}
