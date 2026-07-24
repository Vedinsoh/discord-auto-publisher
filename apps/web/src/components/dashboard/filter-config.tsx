'use client';

import { Filter as FilterIcon, Hash, Loader2, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  ChannelLimitCta,
  channelLimitReasonFromGuild,
} from '@/components/dashboard/channel-limit-upsell';
import { FilterEditorModal } from '@/components/dashboard/filter-editor-modal';
import {
  FILTER_TYPE_LABELS,
  MATCH_MODE_OPTIONS,
  MAX_FILTERS_PER_CHANNEL,
  roleColorHex,
} from '@/components/dashboard/filter-meta';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { getGuildRoles, removeFilter, setFilterMode } from '@/lib/api/actions';
import { signInOnAuthExpired } from '@/lib/api/client-auth';
import type { ChannelFilterRule, FilterMatchMode, GuildChannel, GuildRole } from '@/lib/api/types';

interface FilterManagerProps {
  guildId: string;
  channels: GuildChannel[];
  /** Premium bot present AND actively managing (handover complete). */
  isActive: boolean;
  hasSubscription: boolean;
  premiumBotPresent: boolean;
  premiumPending: boolean;
}

/** A single filter value rendered as a chip (role name+color, or a raw ID/keyword). */
function ValueChip({
  filter,
  value,
  rolesById,
}: {
  filter: ChannelFilterRule;
  value: string;
  rolesById: Record<string, GuildRole>;
}) {
  const role = filter.type === 'mention' ? rolesById[value] : undefined;
  if (role) {
    const hex = roleColorHex(role.color);
    return (
      <Badge className="gap-1 bg-slate-800 text-slate-200 border-slate-700">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: hex ?? '#94a3b8' }} />
        {role.name}
      </Badge>
    );
  }
  const mono = filter.type !== 'keyword';
  return (
    <Badge className={`bg-slate-800 text-slate-300 border-slate-700 ${mono ? 'font-mono' : ''}`}>
      {value}
    </Badge>
  );
}

export function FilterManager({
  guildId,
  channels,
  isActive,
  hasSubscription,
  premiumBotPresent,
  premiumPending,
}: FilterManagerProps) {
  const router = useRouter();
  const [roles, setRoles] = useState<GuildRole[]>([]);
  const [isPending, startTransition] = useTransition();
  const [editor, setEditor] = useState<{
    channelId: string;
    channelName: string;
    filter: ChannelFilterRule | null;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    channelId: string;
    filter: ChannelFilterRule;
  } | null>(null);

  const rolesById = useMemo(() => Object.fromEntries(roles.map(role => [role.id, role])), [roles]);

  useEffect(() => {
    let cancelled = false;
    // Roles power the mention picker + resolve role names for display. A failure
    // is non-fatal — the UI falls back to raw IDs.
    getGuildRoles(guildId)
      .then(fetched => {
        if (!cancelled) setRoles(fetched);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [guildId]);

  const enabledChannels = channels.filter(channel => channel.enabled);

  const handleModeChange = (channelId: string, mode: FilterMatchMode) => {
    startTransition(async () => {
      const result = await setFilterMode(guildId, channelId, mode);
      if (result.ok) {
        router.refresh();
        return;
      }
      signInOnAuthExpired(result.status);
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      const result = await removeFilter(guildId, target.channelId, target.filter.id);
      setDeleteTarget(null);
      if (result.ok) {
        router.refresh();
        return;
      }
      signInOnAuthExpired(result.status);
    });
  };

  const lockReason = channelLimitReasonFromGuild({
    hasSubscription,
    premiumBotPresent,
    premiumPending,
  });

  return (
    <div className="space-y-6">
      {!isActive && (
        <Card className="flex flex-col gap-4 border-purple-500/30 bg-purple-500/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-purple-400" />
            <div>
              <p className="font-medium text-white">Filter editing is locked</p>
              <p className="text-sm text-slate-400">
                {lockReason === 'LIMIT_PREMIUM_PENDING'
                  ? 'Your Premium bot is activating. Grant it publish permission so it can take over — then filters become editable and start applying.'
                  : 'Invite your Premium bot to this server to edit filters. Existing filters are shown below and apply once the Premium bot is active.'}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <ChannelLimitCta reason={lockReason} guildId={guildId} />
          </div>
        </Card>
      )}

      {enabledChannels.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/50 p-12 text-center">
          <FilterIcon className="mx-auto mb-4 h-16 w-16 text-slate-600" />
          <p className="mb-2 text-slate-400">No enabled channels yet</p>
          <p className="text-sm text-slate-500">
            Enable a channel on the{' '}
            <Link href={`/dashboard/${guildId}/channels`} className="text-blue-400 hover:underline">
              Channels
            </Link>{' '}
            tab, then add filters here.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {enabledChannels.map(channel => {
            const atFilterLimit = channel.filters.length >= MAX_FILTERS_PER_CHANNEL;
            return (
              <Card key={channel.channelId} className="border-slate-800 bg-slate-900/50 p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Hash className="h-5 w-5 text-blue-400" />
                    <h3 className="text-lg text-white">{channel.name}</h3>
                    <Badge className="border-slate-600 bg-slate-700/50 text-xs text-slate-400">
                      {channel.filters.length}/{MAX_FILTERS_PER_CHANNEL}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Match</span>
                    <SegmentedControl
                      options={MATCH_MODE_OPTIONS}
                      value={channel.filterMode}
                      onChange={mode => handleModeChange(channel.channelId, mode)}
                      disabled={!isActive || isPending}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {channel.filters.length === 0 && (
                    <p className="py-2 text-sm text-slate-500">
                      No filters — this channel publishes every message.
                    </p>
                  )}
                  {channel.filters.map(filter => (
                    <div
                      key={filter.id}
                      className="flex flex-wrap items-center gap-3 border-b border-slate-800 py-3 last:border-0"
                    >
                      <Badge
                        className={
                          filter.mode === 'allow'
                            ? 'border-green-500/30 bg-green-500/20 text-green-400'
                            : 'border-red-500/30 bg-red-500/20 text-red-400'
                        }
                      >
                        {filter.mode}
                      </Badge>
                      <span className="text-sm text-slate-300">
                        {FILTER_TYPE_LABELS[filter.type] ?? filter.type}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {filter.values.map(value => (
                          <ValueChip
                            key={value}
                            filter={filter}
                            value={value}
                            rolesById={rolesById}
                          />
                        ))}
                      </div>
                      {isActive && (
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            type="button"
                            aria-label="Edit filter"
                            onClick={() =>
                              setEditor({
                                channelId: channel.channelId,
                                channelName: channel.name,
                                filter,
                              })
                            }
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Delete filter"
                            onClick={() =>
                              setDeleteTarget({ channelId: channel.channelId, filter })
                            }
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {isActive && (
                  <button
                    type="button"
                    disabled={atFilterLimit}
                    onClick={() =>
                      setEditor({
                        channelId: channel.channelId,
                        channelName: channel.name,
                        filter: null,
                      })
                    }
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 transition-colors hover:text-blue-300 disabled:cursor-not-allowed disabled:text-slate-600"
                  >
                    <Plus className="h-4 w-4" />
                    {atFilterLimit ? 'Filter limit reached' : 'Add filter'}
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {editor && (
        <FilterEditorModal
          guildId={guildId}
          channelId={editor.channelId}
          channelName={editor.channelName}
          filter={editor.filter}
          roles={roles}
          rolesById={rolesById}
          onClose={() => setEditor(null)}
        />
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={open => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this filter?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget &&
                `The ${FILTER_TYPE_LABELS[deleteTarget.filter.type] ?? deleteTarget.filter.type} ${deleteTarget.filter.mode} rule will be removed. This can't be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 text-white hover:bg-red-500"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
