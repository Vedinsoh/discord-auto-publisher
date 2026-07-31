import { Check, Crown, Minus } from 'lucide-react';
import { PLAN_COMPARISON, type PlanValue } from '@/lib/plans';

interface PlanComparisonTableProps {
  className?: string;
}

/**
 * The row-aligned free-vs-premium comparison, shared verbatim by the marketing
 * section and the dashboard's free subscription state — the two surfaces used to
 * hold independent flat lists that could (and did) disagree in length, order and
 * wording. Rows come from PLAN_COMPARISON; callers own the surrounding chrome
 * (card, section heading, CTA) and nothing else.
 *
 * A real <table> rather than a grid of divs: the value cells are ticks and
 * dashes, which only mean something in relation to their row and column, and
 * scope="row"/"col" is what makes a screen reader announce that relation.
 *
 * No "current plan" marker on a column: the dashboard card that hosts this is
 * already titled "You're on the Free plan", and a stacked CURRENT caption under
 * the Free header read as a third column header while knocking the three headers
 * out of vertical alignment. The surrounding surface says which plan is yours;
 * the table only has to say what the plans are.
 */
export function PlanComparisonTable({ className }: PlanComparisonTableProps) {
  return (
    <table className={`w-full border-collapse text-left ${className ?? ''}`}>
      <thead>
        <tr className="border-b border-slate-800">
          <th
            scope="col"
            className="pb-2 text-xs font-normal uppercase tracking-wide text-slate-500"
          >
            Feature
          </th>
          <th scope="col" className="w-18 pb-2 text-center text-xs font-normal text-slate-400">
            Free
          </th>
          <th scope="col" className="w-24 pb-2 text-center text-xs font-normal text-blue-300">
            <span className="inline-flex items-center gap-1">
              <Crown className="h-3 w-3" aria-hidden="true" />
              Premium
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        {PLAN_COMPARISON.map(row => (
          <tr key={row.label} className="border-b border-slate-800/60 align-top last:border-0">
            <th scope="row" className="py-3 pr-3 font-normal">
              <span className="block text-sm text-slate-200">{row.label}</span>
              {row.detail && (
                <span className="mt-0.5 block text-xs text-slate-500">{row.detail}</span>
              )}
            </th>
            <td className="py-3 text-center">
              <PlanValueCell value={row.free} />
            </td>
            <td className="py-3 text-center">
              <PlanValueCell value={row.premium} premium />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Icons carry sr-only text so a dash isn't announced as an empty cell. */
function PlanValueCell({ value, premium }: { value: PlanValue; premium?: boolean }) {
  if (value === false) {
    return (
      <>
        <Minus className="mx-auto h-4 w-4 text-slate-600" aria-hidden="true" />
        <span className="sr-only">Not included</span>
      </>
    );
  }
  if (value === true) {
    return (
      <>
        <Check
          className={`mx-auto h-4 w-4 ${premium ? 'text-blue-400' : 'text-slate-400'}`}
          aria-hidden="true"
        />
        <span className="sr-only">Included</span>
      </>
    );
  }
  return <span className={`text-sm ${premium ? 'text-blue-200' : 'text-slate-300'}`}>{value}</span>;
}
