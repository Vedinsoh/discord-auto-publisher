import { AlertTriangle } from 'lucide-react';
import { legalEffectiveDates } from '@/lib/legal/documents';

/**
 * Renders a document's effective date, or a draft warning when it has none. One
 * component for both states on purpose: setting the date in `legalEffectiveDates` is
 * what flips it, so there is no separate banner to remember to delete — and a document
 * cannot silently read as in force while still holding placeholders.
 */
export function DocumentStatus({ document }: { document: string }) {
  const effectiveDate = legalEffectiveDates[document];

  if (!effectiveDate) {
    return (
      <div className="not-prose flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          <strong className="font-semibold text-amber-100">Draft — not in force.</strong> This
          document is unfinished, has not been reviewed, and does not bind anyone. It may contain
          unfilled placeholders.
        </p>
      </div>
    );
  }

  return (
    <p className="not-prose text-sm text-slate-500">
      Effective from{' '}
      <time dateTime={effectiveDate}>
        {new Date(`${effectiveDate}T00:00:00Z`).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        })}
      </time>
    </p>
  );
}
