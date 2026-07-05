'use client';

import { Hash, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { migrateGuild } from '@/lib/api/actions';
import type { Edition, GuildChannel } from '@/lib/api/types';

// MIGRATION: Remove this component after migration period (6 months)

interface LegacyMigrateModalProps {
  edition: Edition;
  guildId: string;
  channels: GuildChannel[];
  /** Max selectable channels, or null for unlimited (premium) */
  limit: number | null;
  onClose: () => void;
}

export function LegacyMigrateModal({
  edition,
  guildId,
  channels,
  limit,
  onClose,
}: LegacyMigrateModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  const publishableCount = channels.filter(c => c.canPublish).length;
  const overLimit = limit !== null && publishableCount > limit;

  // Preselect all currently-publishing channels when they fit the plan limit
  // (migration is then a behavioral no-op); otherwise force an explicit choice
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(overLimit ? [] : channels.filter(c => c.canPublish).map(c => c.channelId))
  );

  const toggleChannel = (channelId: string) => {
    setSelected(previous => {
      const next = new Set(previous);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  };

  const overSelected = limit !== null && selected.size > limit;

  const handleConfirm = () => {
    setError(false);
    startTransition(async () => {
      try {
        await migrateGuild(edition, guildId, [...selected]);
        onClose();
        router.refresh();
      } catch {
        setError(true);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <Card className="bg-slate-900 border-slate-700 w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h3 className="text-xl text-white mb-1">Switch to the new system</h3>
            <p className="text-slate-400 text-sm">
              {overLimit
                ? `${publishableCount} channels currently auto-publish. The free plan covers ${limit} — choose which ones keep publishing, or upgrade for unlimited.`
                : 'Channels the bot currently publishes in are preselected. Unselected channels will stop publishing.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors shrink-0 ml-4"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 space-y-2 overflow-y-auto flex-1">
          {channels.map(channel => {
            const checked = selected.has(channel.channelId);
            return (
              <button
                key={channel.channelId}
                type="button"
                onClick={() => toggleChannel(channel.channelId)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                  checked
                    ? 'bg-blue-500/10 border-blue-500/50'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    checked ? 'bg-blue-500 border-blue-500' : 'border-slate-500'
                  }`}
                >
                  {checked && <span className="w-2 h-2 bg-white rounded-sm" />}
                </span>
                <Hash className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-white truncate">{channel.name}</span>
                {!channel.canPublish && (
                  <span className="text-slate-500 text-xs ml-auto shrink-0">
                    missing permissions
                  </span>
                )}
              </button>
            );
          })}
          {channels.length === 0 && (
            <p className="text-slate-500 text-sm py-4 text-center">
              No announcement channels found. You can still switch now and enable channels later.
            </p>
          )}
        </div>

        <div className="p-6 pt-4 space-y-3">
          {overSelected && (
            <p className="text-amber-400 text-sm">
              The free plan covers {limit} channels. Deselect some, or upgrade to Premium for
              unlimited channels.
            </p>
          )}
          {error && <p className="text-red-400 text-sm">Migration failed. Please try again.</p>}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isPending || overSelected}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Switch ({selected.size} {selected.size === 1 ? 'channel' : 'channels'})
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
