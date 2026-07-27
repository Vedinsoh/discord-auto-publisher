'use client';

import {
  Ban,
  Check,
  Filter as FilterIcon,
  Hash,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import type {
  ChannelFilterRule,
  FilterMatchMode,
  FilterMode,
  GuildChannel,
  GuildRole,
} from '@/lib/api/types';
import { cn } from '@/lib/utils';

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

/** One filter's type label + value chips + edit/delete actions. */
function FilterRow({
  filter,
  rolesById,
  isActive,
  onEdit,
  onDelete,
}: {
  filter: ChannelFilterRule;
  rolesById: Record<string, GuildRole>;
  isActive: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 py-3 last:border-0">
      <span className="text-sm text-slate-300">
        {FILTER_TYPE_LABELS[filter.type] ?? filter.type}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {filter.values.map(value => (
          <ValueChip key={value} filter={filter} value={value} rolesById={rolesById} />
        ))}
      </div>
      {isActive && (
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="Edit filter"
            onClick={onEdit}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Delete filter"
            onClick={onDelete}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
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
    mode: FilterMode;
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

  // Deep-link target: the Channels page links its filter pill here with
  // `?channel=<id>` so we open (and scroll to) that channel's accordion. With no
  // such param, every channel starts collapsed.
  const searchParams = useSearchParams();
  const requestedChannelId = searchParams.get('channel');
  const targetChannelId =
    requestedChannelId && enabledChannels.some(c => c.channelId === requestedChannelId)
      ? requestedChannelId
      : undefined;

  const accordionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!requestedChannelId) return;
    accordionRef.current
      ?.querySelector(`[data-channel-id="${requestedChannelId}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [requestedChannelId]);

  const handleModeChange = (channelId: string, mode: FilterMatchMode) => {
    startTransition(async () => {
      const result = await setFilterMode(guildId, channelId, mode);
      if (result.ok) {
        toast.success(`Now publishing if a message matches ${mode} allow rules`);
        router.refresh();
        return;
      }
      if (signInOnAuthExpired(result.status)) return;
      toast.error("Couldn't update match mode");
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      const result = await removeFilter(guildId, target.channelId, target.filter.id);
      setDeleteTarget(null);
      if (result.ok) {
        toast.success('Filter deleted');
        router.refresh();
        return;
      }
      if (signInOnAuthExpired(result.status)) return;
      toast.error("Couldn't delete the filter", { description: 'Please try again.' });
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
        <div ref={accordionRef}>
          <Accordion type="single" collapsible defaultValue={targetChannelId} className="space-y-4">
            {enabledChannels.map(channel => {
              const blockFilters = channel.filters.filter(f => f.mode === 'block');
              const allowFilters = channel.filters.filter(f => f.mode === 'allow');
              const atFilterLimit = channel.filters.length >= MAX_FILTERS_PER_CHANNEL;
              const hasRules = channel.filters.length > 0;

              const openEditor = (mode: FilterMode, filter: ChannelFilterRule | null) =>
                setEditor({
                  channelId: channel.channelId,
                  channelName: channel.name,
                  mode,
                  filter,
                });

              const addButton = (mode: FilterMode, label: string) =>
                isActive && (
                  <button
                    type="button"
                    disabled={atFilterLimit}
                    onClick={() => openEditor(mode, null)}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 transition-colors hover:text-blue-300 disabled:cursor-not-allowed disabled:text-slate-600"
                  >
                    <Plus className="h-4 w-4" />
                    {atFilterLimit ? 'Filter limit reached' : label}
                  </button>
                );

              return (
                <AccordionItem
                  key={channel.channelId}
                  value={channel.channelId}
                  data-channel-id={channel.channelId}
                  className={cn(
                    'overflow-hidden rounded-xl border transition-colors',
                    hasRules
                      ? 'border-blue-500/20 bg-blue-500/[0.04] hover:border-blue-500/40 data-[state=open]:border-blue-500/40'
                      : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 data-[state=open]:border-slate-700'
                  )}
                >
                  <AccordionTrigger className="cursor-pointer px-6 py-4 hover:no-underline [&>svg]:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Hash className="h-5 w-5 text-blue-400" />
                      <span className="text-lg text-white">{channel.name}</span>
                      <Badge className="border-slate-600 bg-slate-700/50 text-xs text-slate-400">
                        {channel.filters.length}/{MAX_FILTERS_PER_CHANNEL}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="grid gap-6 md:grid-cols-2 md:gap-0 md:divide-x divide-slate-800">
                      {/* Block rules */}
                      <section className="md:pr-6">
                        <div className="mb-1 flex items-center gap-2">
                          <Ban className="h-4 w-4 text-red-400" />
                          <h4 className="text-sm font-medium text-white">Block rules</h4>
                        </div>
                        <p className="mb-2 text-xs text-slate-500">
                          A message is never published if it matches any block rule.
                        </p>
                        {blockFilters.length === 0 ? (
                          <p className="py-1 text-sm text-slate-500">No block rules.</p>
                        ) : (
                          <div>
                            {blockFilters.map(filter => (
                              <FilterRow
                                key={filter.id}
                                filter={filter}
                                rolesById={rolesById}
                                isActive={isActive}
                                onEdit={() => openEditor('block', filter)}
                                onDelete={() =>
                                  setDeleteTarget({ channelId: channel.channelId, filter })
                                }
                              />
                            ))}
                          </div>
                        )}
                        {addButton('block', 'Add block rule')}
                      </section>

                      {/* Allow rules */}
                      <section className="md:pl-6">
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-400" />
                            <h4 className="text-sm font-medium text-white">Allow rules</h4>
                          </div>
                          {allowFilters.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Publish if matching</span>
                              <SegmentedControl
                                options={MATCH_MODE_OPTIONS}
                                value={channel.filterMode}
                                onChange={mode => handleModeChange(channel.channelId, mode)}
                                disabled={!isActive || isPending}
                                size="sm"
                              />
                              <span className="text-xs text-slate-500">rules</span>
                            </div>
                          )}
                        </div>
                        <p className="mb-2 text-xs text-slate-500">
                          With no allow rules, every message publishes unless a block rule matches.
                        </p>
                        {allowFilters.length === 0 ? (
                          <p className="py-1 text-sm text-slate-500">No allow rules.</p>
                        ) : (
                          <div>
                            {allowFilters.map(filter => (
                              <FilterRow
                                key={filter.id}
                                filter={filter}
                                rolesById={rolesById}
                                isActive={isActive}
                                onEdit={() => openEditor('allow', filter)}
                                onDelete={() =>
                                  setDeleteTarget({ channelId: channel.channelId, filter })
                                }
                              />
                            ))}
                          </div>
                        )}
                        {addButton('allow', 'Add allow rule')}
                      </section>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}

      {editor && (
        <FilterEditorModal
          guildId={guildId}
          channelId={editor.channelId}
          channelName={editor.channelName}
          mode={editor.mode}
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
