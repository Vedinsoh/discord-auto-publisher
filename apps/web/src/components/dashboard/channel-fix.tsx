'use client';

import { TriangleAlert, X } from 'lucide-react';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import type { GuildChannel } from '@/lib/api/types';

/**
 * A channel's publish problem, surfaced identically on the Overview and Channels
 * tabs via one shared Fix button + modal (CONTEXT "Channel Fix affordance").
 * Color is a severity axis, not branding:
 * - `permissions` (red) — an actual problem now: the managing bot can't publish,
 *   so nothing is being crossposted (`canPublish === false`).
 * - `premium` (yellow) — a potential problem: the free bot still serves the
 *   channel, but publishing breaks the moment the handover completes / the free
 *   bot leaves, because the premium bot can't publish yet
 *   (`premiumBotHasPermissions === false`).
 * Red outranks yellow when both apply — one button, one modal.
 */
export type ChannelFixVariant = 'permissions' | 'premium';

/** The Fix variant a channel needs, or null when it has no publish problem. */
export function channelFixVariant(channel: GuildChannel): ChannelFixVariant | null {
  if (channel.canPublish === false) return 'permissions';
  if (channel.premiumBotHasPermissions === false) return 'premium';
  return null;
}

// Enabled-channel status coloring, shared by the Overview and Channels tabs so a
// channel reads the same color on both: red = actual problem (managing bot can't
// publish), yellow = potential problem (premium bot can't take over yet), green =
// healthy. See CONTEXT "Channel Fix affordance".
const CHANNEL_STATUS_STYLES = {
  permissions: { card: 'bg-red-500/5 border-red-500/30', icon: 'text-red-400' },
  premium: { card: 'bg-yellow-500/5 border-yellow-500/30', icon: 'text-yellow-400' },
  healthy: { card: 'bg-green-500/2 border-green-500/40', icon: 'text-green-500' },
} as const;

/** Card + icon classes for an enabled channel, keyed off its Fix variant. */
export function channelStatusStyle(channel: GuildChannel) {
  return CHANNEL_STATUS_STYLES[channelFixVariant(channel) ?? 'healthy'];
}

// Canonical publish permissions (PUBLISH_PERMISSION_FLAGS in @ap/utils). The modal
// always lists all three rather than a computed missing-subset: when ViewChannel is
// absent Discord's permission math collapses the missing set to just ViewChannel
// (the channel is invisible), which misleads the user into granting one perm that
// still won't publish. "Ensure the bot has these three" is always correct.
const PUBLISH_PERMISSIONS = ['View Channel', 'Send Messages', 'Manage Messages'];

const BUTTON_STYLES: Record<ChannelFixVariant, string> = {
  permissions: 'text-red-400 hover:bg-red-500/10',
  premium: 'text-yellow-400 hover:bg-yellow-500/10',
};

/**
 * Instructional Fix button for a broken/at-risk channel. Instructional only —
 * no recheck/confirm action: the publish-state cache is bot-pushed and
 * self-updates once permissions change (ADR 0008), so any action button would
 * lie or burn Discord REST.
 */
export function ChannelFixButton({ channel }: { channel: GuildChannel }) {
  const [open, setOpen] = useState(false);
  const variant = channelFixVariant(channel);
  if (!variant) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm shrink-0 transition-colors cursor-pointer ${BUTTON_STYLES[variant]}`}
      >
        <TriangleAlert className="w-4 h-4" />
        <span>Fix</span>
      </button>
      {open && (
        <ChannelFixModal channel={channel} variant={variant} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function ChannelFixModal({
  channel,
  variant,
  onClose,
}: {
  channel: GuildChannel;
  variant: ChannelFixVariant;
  onClose: () => void;
}) {
  const isPremium = variant === 'premium';
  const heading = isPremium ? 'Premium bot needs access' : 'This channel isn’t publishing';
  const iconColor = isPremium ? 'text-yellow-400' : 'text-red-400';
  const intro = isPremium
    ? `Your Premium bot is in this server but can’t publish in this channel yet, so it can’t take over from the free bot. The free bot is still publishing here for now — grant the Premium bot access and it switches over automatically.`
    : `Auto Publisher can’t publish in this channel because it’s missing permissions. Grant them and publishing resumes on its own.`;

  return (
    // Backdrop click closes; stop propagation on the card so inner clicks don't.
    // Keyboard users close via the focusable corner X, so the backdrop needs no role.
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-dismiss
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <Card
        className="bg-slate-900 border-slate-700 w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6">
          <div className="flex items-start gap-4">
            <TriangleAlert className={`w-6 h-6 ${iconColor} shrink-0 mt-1`} />
            <div>
              <h3 className="text-xl text-white mb-2">{heading}</h3>
              <p className="text-slate-300 text-sm mb-4">{intro}</p>
              <ol className="space-y-1 text-slate-400 text-sm list-decimal list-inside">
                <li>
                  Locate the <span className="text-slate-200">#{channel.name}</span>
                </li>
                <li>Open the channel’s settings</li>
                <li>Go to Permissions tab</li>
                <li>Select the bot’s role (or add it as a member override)</li>
                <li>
                  Enable the following permissions:
                  <ul className="ml-4">
                    {PUBLISH_PERMISSIONS.map(perm => (
                      <li key={perm} className="text-slate-200 text-sm">
                        • {perm}
                      </li>
                    ))}
                  </ul>
                </li>
                <li>Save changes & refresh this page</li>
              </ol>
            </div>
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
      </Card>
    </div>
  );
}
