'use client';

import { Check, ChevronDown, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  FILTER_TYPE_OPTIONS,
  FILTER_VALUE_LABELS,
  filterSentence,
  isNoOpKeyword,
  KEYWORD_WILDCARD_EXAMPLES,
  MAX_VALUES,
  roleColorHex,
  SNOWFLAKE_REGEX,
} from '@/components/dashboard/filter-meta';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TagInput } from '@/components/ui/tag-input';
import { addFilter, updateFilter } from '@/lib/api/actions';
import { signInOnAuthExpired } from '@/lib/api/client-auth';
import type { ChannelFilterRule, FilterMode, FilterType, GuildRole } from '@/lib/api/types';

interface FilterEditorModalProps {
  guildId: string;
  channelId: string;
  channelName: string;
  /** allow = "only publish if matches", block = "never publish if matches". Fixed once set. */
  mode: FilterMode;
  /** null = create a new filter; otherwise edit this one (its type is fixed). */
  filter: ChannelFilterRule | null;
  roles: GuildRole[];
  rolesById: Record<string, GuildRole>;
  onClose: () => void;
}

export function FilterEditorModal({
  guildId,
  channelId,
  channelName,
  mode,
  filter,
  roles,
  rolesById,
  onClose,
}: FilterEditorModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = filter !== null;

  const [type, setType] = useState<FilterType>(filter?.type ?? 'keyword');

  // keyword / webhook / author values
  const [values, setValues] = useState<string[]>(
    filter && filter.type !== 'mention' ? filter.values : []
  );
  // mention is split into a role picker + a user-ID input
  const [roleIds, setRoleIds] = useState<string[]>(() =>
    filter?.type === 'mention' ? filter.values.filter(v => rolesById[v]) : []
  );
  const [userIds, setUserIds] = useState<string[]>(() =>
    filter?.type === 'mention' ? filter.values.filter(v => !rolesById[v]) : []
  );

  const effectiveValues = type === 'mention' ? [...roleIds, ...userIds] : values;
  const max = MAX_VALUES[type];
  const canSubmit = effectiveValues.length >= 1 && effectiveValues.length <= max;

  const selectedRoleSet = useMemo(() => new Set(roleIds), [roleIds]);

  const handleTypeChange = (next: FilterType) => {
    setType(next);
    setValues([]);
    setRoleIds([]);
    setUserIds([]);
    setError(null);
  };

  const toggleRole = (roleId: string) => {
    setError(null);
    if (selectedRoleSet.has(roleId)) {
      setRoleIds(previous => previous.filter(id => id !== roleId));
      return;
    }
    if (roleIds.length + userIds.length >= max) {
      setError(`Maximum ${max} mentions per filter`);
      return;
    }
    setRoleIds(previous => [...previous, roleId]);
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateFilter(guildId, channelId, filter.id, { type, mode, values: effectiveValues })
        : await addFilter(guildId, channelId, { type, mode, values: effectiveValues });

      if (result.ok) {
        onClose();
        toast.success(isEdit ? 'Filter updated' : 'Filter added');
        router.refresh();
        return;
      }
      if (signInOnAuthExpired(result.status)) return;
      setError(
        result.code === 'PREMIUM_INACTIVE'
          ? 'The Premium bot is not active for this server yet.'
          : 'Could not save the filter. Please try again.'
      );
    });
  };

  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !isPending) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit' : 'Add'} {mode === 'block' ? 'block' : 'allow'} rule
          </DialogTitle>
          <DialogDescription>#{channelName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Live plain-English preview of what this rule does. */}
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              mode === 'block'
                ? 'border-red-500/30 bg-red-500/10 text-red-200'
                : 'border-green-500/30 bg-green-500/10 text-green-200'
            }`}
          >
            {filterSentence(mode, type)}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-slate-200">Type</p>
            <SegmentedControl
              options={FILTER_TYPE_OPTIONS}
              value={type}
              onChange={handleTypeChange}
              disabled={isEdit}
              size="sm"
            />
            {isEdit && (
              <p className="text-xs text-slate-500">
                Type can't be changed — delete and re-add to switch type.
              </p>
            )}
          </div>

          {/* Values */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-slate-200">{FILTER_VALUE_LABELS[type]}</p>

            {type === 'keyword' && (
              <>
                <TagInput
                  values={values}
                  onChange={setValues}
                  maxItems={max}
                  placeholder="Type a keyword, press Enter"
                  transform={value => value.trim().toLowerCase()}
                  validate={value =>
                    value.length > 200
                      ? 'Keyword is too long (max 200 chars)'
                      : isNoOpKeyword(value)
                        ? 'Keyword cannot be empty or only wildcards'
                        : null
                  }
                />
                <p className="text-xs text-slate-500">
                  Matches whole words.{' '}
                  {KEYWORD_WILDCARD_EXAMPLES.map((example, index) => (
                    <span key={example.pattern}>
                      {index > 0 && ' · '}
                      <code className="rounded bg-slate-800 px-1 font-mono text-slate-300">
                        {example.pattern}
                      </code>{' '}
                      {example.hint}
                    </span>
                  ))}
                </p>
              </>
            )}

            {type === 'webhook' && (
              <TagInput
                values={values}
                onChange={setValues}
                maxItems={max}
                placeholder="Paste a webhook ID, press Enter"
                validate={value =>
                  SNOWFLAKE_REGEX.test(value) ? null : 'Enter a valid ID (17-20 digits)'
                }
              />
            )}

            {type === 'author' && (
              <>
                <TagInput
                  values={values}
                  onChange={setValues}
                  maxItems={max}
                  placeholder="Paste a user ID, press Enter"
                  validate={value =>
                    SNOWFLAKE_REGEX.test(value) ? null : 'Enter a valid user ID (17-20 digits)'
                  }
                />
                <p className="text-xs text-slate-500">
                  Enable Developer Mode in Discord, then right-click a user → Copy User ID.
                </p>
              </>
            )}

            {type === 'mention' && (
              <div className="space-y-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between border-slate-700 bg-slate-800/50 text-slate-300"
                    >
                      Select roles
                      <ChevronDown className="h-4 w-4 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="max-h-64 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto"
                  >
                    {roles.length === 0 && (
                      <div className="px-3 py-2 text-sm text-slate-500">No roles found</div>
                    )}
                    {roles.map(role => {
                      const selected = selectedRoleSet.has(role.id);
                      const hex = roleColorHex(role.color);
                      return (
                        <DropdownMenuItem
                          key={role.id}
                          onSelect={event => {
                            event.preventDefault();
                            toggleRole(role.id);
                          }}
                        >
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                            {selected && <Check className="h-4 w-4 text-blue-400" />}
                          </span>
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: hex ?? '#94a3b8' }}
                          />
                          <span className="truncate">{role.name}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                {roleIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {roleIds.map(id => {
                      const role = rolesById[id];
                      const hex = role ? roleColorHex(role.color) : null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-700 px-2 py-0.5 text-sm text-slate-200"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: hex ?? '#94a3b8' }}
                          />
                          {role ? role.name : id}
                          <button
                            type="button"
                            aria-label="Remove role"
                            onClick={() => toggleRole(id)}
                            className="text-slate-400 hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <TagInput
                  values={userIds}
                  onChange={setUserIds}
                  maxItems={Math.max(0, max - roleIds.length)}
                  placeholder="…or paste a user ID, press Enter"
                  validate={value =>
                    SNOWFLAKE_REGEX.test(value) ? null : 'Enter a valid user ID (17-20 digits)'
                  }
                />
                <p className="text-xs text-slate-500">
                  {roleIds.length + userIds.length}/{max} mentions selected.
                </p>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

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
            onClick={handleSave}
            disabled={isPending || !canSubmit}
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Add filter'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
