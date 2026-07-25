'use client';

import { Clock, Megaphone, TriangleAlert, X } from 'lucide-react';
import { PermissionSteps } from '@/components/dashboard/channel-permission-steps';
import { publishDelayCopy } from '@/components/dashboard/publish-delay-note';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

/**
 * Acknowledgment gate shown before enabling a channel from the Channels tab
 * (CONTEXT "Channel enable guide"). Built on AlertDialog: it interrupts and
 * requires a response, so it does NOT close on outside click. "I granted the permissions" commits (fires the enable);
 * the corner X or ESC aborts (no enable).
 */
export function ChannelEnableGuideModal({
  channelName,
  hasSubscription,
  onConfirm,
  onCancel,
}: {
  channelName: string;
  /** Entitled guild → minimal-delay copy; else the free reassurance + upsell. */
  hasSubscription: boolean;
  /** Commit: enable the channel. */
  onConfirm: () => void;
  /** Abort: leave the channel disabled. Fired by the corner X and ESC. */
  onCancel: () => void;
}) {
  return (
    <AlertDialog
      open
      onOpenChange={open => {
        // Only fires on ESC (AlertDialog ignores outside clicks by design).
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent>
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-md text-slate-500 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          aria-label="Cancel"
        >
          <X className="h-5 w-5" />
        </button>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <Megaphone className="mt-1 h-6 w-6 shrink-0 text-blue-400" />
            <div>
              <AlertDialogTitle>
                Enable <span className="text-blue-300">#{channelName}</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                Before auto-publishing can start, you must grant the bot permission to send messages
                in this channel:
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="pl-10">
          <PermissionSteps channelName={channelName} />
        </div>

        <div className="ml-10 flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-sm text-amber-200/90">
              Discord allows up to{' '}
              <span className="font-medium text-amber-100">10 published messages per hour</span> per
              channel.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-sm text-amber-200/90">{publishDelayCopy(hasSubscription)}</p>
          </div>
        </div>

        <AlertDialogFooter>
          <Button className="w-full" onClick={onConfirm}>
            I granted the permissions
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
