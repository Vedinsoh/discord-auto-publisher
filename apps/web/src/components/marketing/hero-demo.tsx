import { Check, Hash, LoaderCircle, Megaphone, Newspaper } from 'lucide-react';
import { values } from '@/lib/constants';
import { formatNumberFull } from '@/lib/utils';

export function HeroDemo() {
  const serverCount = formatNumberFull(values.activeServers);

  return (
    <div className="relative">
      {/* Breathing glow behind the mockup */}
      <div className="animate-glow-breath absolute -inset-x-[6%] -top-[10%] -bottom-[12%] z-0 bg-radial-[circle_closest-side] from-blue-600/35 to-transparent to-72% blur-[20px]" />
      {/* Floating window */}
      <div className="animate-floaty relative z-10 overflow-hidden rounded-4xl border border-indigo-400/16 bg-slate-900 shadow-[0_40px_90px_-30px_rgba(0,0,0,.85),0_0_0_1px_rgba(120,150,255,.04)]">
        <div className="flex min-h-75">
          {/* Server rail */}
          <div className="flex w-15 flex-col items-center gap-3 border-r border-indigo-400/7 bg-slate-950 py-4">
            <div className="flex size-10 items-center justify-center rounded-[13px] bg-linear-to-br from-blue-500 to-blue-600 text-white shadow-[0_6px_16px_-6px_rgba(47,107,255,.9)]">
              <Megaphone className="size-4.75" />
            </div>
            <div className="size-10 rounded-full bg-slate-900" />
            <div className="size-10 rounded-full bg-slate-900" />
            <div className="size-10 rounded-full bg-slate-900 opacity-60" />
          </div>

          {/* Channel */}
          <div className="flex flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-indigo-400/8 px-4 py-3.25">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Hash className="size-4 text-slate-500" /> announcements
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-green-400/28 bg-green-400/10 px-2.5 py-1 text-[11px] font-semibold text-green-300 uppercase">
                <span className="animate-live-ping inline-block size-1.5 rounded-full bg-green-400" />
                Auto-Publishing on
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-4">
              {/* Bot message: pops in colorless, then gains green background + border with the success toast */}
              <div className="animate-hero-message flex gap-2.75 rounded-[11px] border border-transparent px-3 py-2.5 text-[13.5px] leading-normal">
                <div className="flex size-9 shrink-0 rounded-full items-center justify-center bg-linear-to-br from-slate-700 to-slate-800 text-white">
                  <Newspaper className="size-4.25" />
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13.5px] font-semibold text-slate-200">News bot</span>
                    <span className="text-[11px] text-slate-500">
                      Today at{' '}
                      {new Date().toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[13.5px] leading-normal text-slate-300">
                    v2 patch notes are live, huge thanks to everyone who tested. 🚀
                  </div>
                </div>
              </div>
              <div className="animate-hero-tag inline-flex items-center gap-1.5 text-[12px] font-semibold text-green-300 ml-2">
                <Megaphone className="size-4" /> Published to {serverCount} servers
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Floating toast - pending */}
      <div className="animate-hero-toast-pending absolute -right-2.5 bottom-6 z-20 inline-flex items-center gap-2.5 rounded-[14px] border border-blue-700/30 bg-blue-950/30 px-4 py-3 shadow-[0_20px_50px_-18px_rgba(0,0,0,.8)]">
        <div className="flex size-8 items-center justify-center rounded-[9px] bg-blue-400/16 text-blue-400">
          <LoaderCircle className="animate-spin size-4" />
        </div>
        <div>
          <div className="text-[11px] font-bold text-slate-400">Auto Publisher</div>
          <div className="text-[13px] text-slate-100">
            New announcement detected
            <br />
            pushing to every following server now.
          </div>
        </div>
      </div>

      {/* Floating toast - success (replaces pending at 4.5s) */}
      <div className="animate-hero-toast-success absolute -right-2.5 bottom-6 z-20 inline-flex items-center gap-2.5 rounded-[14px] border border-green-400/30 bg-slate-900 px-4 py-3 shadow-[0_20px_50px_-18px_rgba(0,0,0,.8)]">
        <div className="flex size-8 items-center justify-center rounded-[9px] bg-green-400/16 text-green-400">
          <Check className="size-4" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-slate-100">Published successfully</div>
        </div>
      </div>
    </div>
  );
}
