import { ArrowRight, Check, Lock } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { FILTER_TYPE_LABELS, operatorLabel } from '@/components/dashboard/filter-meta';
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
 * owns the section title). Copy comes from PREMIUM_FEATURE_BLURBS, keyed by tab
 * segment.
 *
 * The CTA names its destination ("See Premium plans") instead of promising the
 * upgrade itself. Both ends used to say "Upgrade to Premium" and look identical,
 * which made the navigation read as a no-op — you pressed a button and landed on
 * the same button. The one genuine upgrade press lives on the Subscription page,
 * still the sole checkout entry point (never a second Paddle overlay). See
 * CONTEXT.md "Locked premium tab".
 *
 * Shape is deliberately NOT the gradient/glow/crown hero the Subscription page's
 * upgrade card uses — that pixel-twinning was the other half of the no-op
 * reading. Where a feature has a preview, it carries the persuasion instead: a
 * picture of the thing you'd get beats a checklist describing it.
 */
export function LockedFeature({ guildId, feature }: LockedFeatureProps) {
  const { label, description, benefits } = PREMIUM_FEATURE_BLURBS[feature];
  const preview = FEATURE_PREVIEWS[feature];

  return (
    <Card className="bg-slate-900/50 border-slate-800 p-6 sm:p-8">
      <div className="flex items-start gap-3 mb-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
          <Lock className="h-4 w-4 text-blue-400" />
        </div>
        <div>
          <h3 className="text-white text-xl">
            <span className="text-blue-300">{label}</span> is a Premium feature
          </h3>
          <p className="text-slate-400 text-sm mt-1">{description}</p>
        </div>
      </div>

      {preview}

      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {benefits.map(benefit => (
          <li key={benefit} className="flex items-start gap-2 text-slate-300 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
            {benefit}
          </li>
        ))}
      </ul>

      <Button
        className="mt-6 w-full bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
        asChild
      >
        <Link href={`/dashboard/${guildId}/subscription`}>
          See Premium plans
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </Button>
    </Card>
  );
}

/**
 * Per-feature preview. Partial on purpose: a premium tab added later renders the
 * header + benefits + CTA with no preview until someone draws one, rather than
 * blocking the tab on artwork.
 */
const FEATURE_PREVIEWS: Partial<Record<PremiumFeatureKey, ReactNode>> = {
  filters: <FilterRulePreview />,
};

/**
 * Static mock of the rule editor — the shape of a real rule, not a working one.
 * Every label comes from `filter-meta` (the same module the live editor reads),
 * so the preview cannot describe a field or operator that doesn't exist; only the
 * illustrative values are hand-written. Inert and hidden from assistive tech: the
 * heading and benefit list above already say what this is, and a screen reader
 * announcing a dropdown that can't be opened would be a worse experience than
 * skipping it.
 *
 * It is a mock, so it WILL drift if the editor's layout changes — eyeball it
 * against the Filters tab when you touch `filter-config.tsx` / `condition-row.tsx`.
 */
function FilterRulePreview() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <span className="absolute right-3 top-3 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
        Preview
      </span>
      <div aria-hidden="true" className="pointer-events-none select-none space-y-3">
        {/* pr-20 clears the absolutely-positioned Preview badge; without it the
            sentence runs underneath and loses its last word. */}
        <p className="pr-20 text-sm text-slate-300">
          Messages will be published when{' '}
          <span className="rounded-md bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
            All
          </span>{' '}
          of these conditions match:
        </p>
        {/* keyword + mention, not author/webhook: those two take raw snowflakes
            in the real editor ("Paste a user ID"), and an 18-digit number tells a
            reader nothing. Mention values resolve to role/user chips, so an
            @-prefixed name here is faithful rather than decorative. */}
        <PreviewCondition type="keyword" negate={false} values={['release', 'patch notes']} />
        <PreviewCondition type="mention" negate={false} values={['@subscribers']} />
      </div>
    </div>
  );
}

function PreviewCondition({
  type,
  negate,
  values,
}: {
  type: keyof typeof FILTER_TYPE_LABELS;
  negate: boolean;
  values: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
      <span className="rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs text-slate-300">
        {FILTER_TYPE_LABELS[type]}
      </span>
      <span className="rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs text-slate-300">
        {operatorLabel(type, negate)}
      </span>
      {values.map(value => (
        <span key={value} className="rounded-md bg-blue-500/15 px-2 py-1 text-xs text-blue-200">
          {value}
        </span>
      ))}
    </div>
  );
}
