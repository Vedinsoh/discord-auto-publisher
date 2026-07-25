import { Plus } from 'lucide-react';
import Link from 'next/link';
import { links, values } from '@/lib/constants';
import { formatNumberFull } from '@/lib/utils';
import { Button } from '../ui/button';

/**
 * Closing CTA on the homepage — a single, centered invite card.
 */
export function FinalCta() {
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-[rgba(120,150,255,.15)] bg-linear-to-b from-slate-900/80 to-slate-950/60 px-6 py-12 text-center sm:px-10 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">
          Ready to automate your announcements?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
          Join {formatNumberFull(values.activeServers)} servers already publishing on autopilot.
        </p>

        <Button
          size="xl"
          className="group relative z-10 mt-10 rounded-xl border-0 bg-linear-to-r from-blue-500 to-blue-600 px-8 py-4 text-white shadow-lg shadow-blue-500/40 transition-all hover:-translate-y-0.5 hover:from-blue-600 hover:to-blue-700 hover:shadow-blue-500/60"
          asChild
        >
          <Link href={links.discordBotInvite} target="_blank">
            <Plus className="h-5 w-5" />
            Invite Auto Publisher
          </Link>
        </Button>

        {/* Bottom glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(ellipse_at_bottom,rgba(59,130,246,.35),transparent_70%)]"
        />
      </div>
    </section>
  );
}
