'use client';

import { TriangleAlert } from 'lucide-react';
import { PermissionSteps } from '@/components/dashboard/channel-permission-steps';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

// Resting severity-tinted background (not a ghost/transparent rest state) so the
// button reads as a control at first glance; darker on hover. See CONTEXT.
const BUTTON_STYLES: Record<ChannelFixVariant, string> = {
  permissions: 'text-red-400 bg-red-500/10 hover:bg-red-500/20',
  premium: 'text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20',
};

/**
 * Instructional Fix button for a broken/at-risk channel. Instructional only —
 * no recheck/confirm action: the publish-state cache is bot-pushed and
 * self-updates once permissions change (ADR 0008), so any action button would
 * lie or burn Discord REST. Dismissible (backdrop or corner X).
 */
export function ChannelFixButton({ channel }: { channel: GuildChannel }) {
  const variant = channelFixVariant(channel);
  if (!variant) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm shrink-0 transition-colors cursor-pointer ${BUTTON_STYLES[variant]}`}
        >
          <TriangleAlert className="w-4 h-4" />
          <span>Fix</span>
        </button>
      </DialogTrigger>
      <ChannelFixModalContent channel={channel} variant={variant} />
    </Dialog>
  );
}

function ChannelFixModalContent({
  channel,
  variant,
}: {
  channel: GuildChannel;
  variant: ChannelFixVariant;
}) {
  const isPremium = variant === 'premium';
  const heading = isPremium ? 'Premium bot needs access' : 'This channel isn’t publishing';
  const iconColor = isPremium ? 'text-yellow-400' : 'text-red-400';
  const intro = isPremium
    ? `Your Premium bot is in this server but can’t publish in this channel yet, so it can’t take over from the free bot. The free bot is still publishing here for now — grant the Premium bot access and it switches over automatically.`
    : `Auto Publisher can’t publish in this channel because it’s missing permissions. Grant them and publishing resumes on its own.`;

  return (
    <DialogContent>
      <DialogHeader>
        <div className="flex items-start gap-4 pr-6">
          <TriangleAlert className={`w-6 h-6 ${iconColor} shrink-0 mt-1`} />
          <div>
            <DialogTitle>{heading}</DialogTitle>
            <DialogDescription className="mt-2">{intro}</DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="pl-10">
        <PermissionSteps channelName={channel.name} />
      </div>
    </DialogContent>
  );
}
