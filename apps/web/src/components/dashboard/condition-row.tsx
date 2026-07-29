'use client';

import {
  AtSign,
  Check,
  ChevronDown,
  type LucideIcon,
  TextAlignStart,
  Trash2,
  User,
  Webhook,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  filterValueError,
  KEYWORD_WILDCARD_EXAMPLES,
  MAX_VALUES,
  OPERATOR_OPTIONS,
  operatorLabel,
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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TagInput } from '@/components/ui/tag-input';
import type { FilterInput, FilterType, GuildRole } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const FIELD_OPTIONS: { value: FilterType; label: string; icon: LucideIcon }[] = [
  { value: 'keyword', label: 'Content', icon: TextAlignStart },
  { value: 'author', label: 'Author', icon: User },
  { value: 'mention', label: 'Mention', icon: AtSign },
  { value: 'webhook', label: 'Webhook', icon: Webhook },
];

const controlClass =
  'flex h-9 items-center rounded-md border border-slate-700 bg-slate-800/60 px-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50';

interface ConditionRowProps {
  condition: FilterInput;
  roles: GuildRole[];
  rolesById: Record<string, GuildRole>;
  disabled?: boolean;
  onChange: (next: FilterInput) => void;
  onRemove: () => void;
}

/**
 * One editable rule condition: field + operator (contains / doesn't contain, …)
 * + a per-field value editor. Fully controlled — edits bubble up via onChange so
 * the parent can persist the whole rule. Deleting a populated row asks first.
 */
export function ConditionRow({
  condition,
  roles,
  rolesById,
  disabled = false,
  onChange,
  onRemove,
}: ConditionRowProps) {
  const { type, negate, values } = condition;
  const max = MAX_VALUES[type];
  const [confirmOpen, setConfirmOpen] = useState(false);

  const field = FIELD_OPTIONS.find(option => option.value === type) ?? FIELD_OPTIONS[0];
  const FieldIcon = field.icon;

  // Mention is stored as one value list but edited as roles (picker) + user IDs.
  const roleIds = useMemo(() => values.filter(v => rolesById[v]), [values, rolesById]);
  const userIds = useMemo(() => values.filter(v => !rolesById[v]), [values, rolesById]);
  const selectedRoleSet = useMemo(() => new Set(roleIds), [roleIds]);

  const setValues = (next: string[]) => onChange({ ...condition, values: next });

  const changeField = (nextType: FilterType) => {
    if (nextType === type) return;
    // Values are field-specific; reset when the field changes.
    onChange({ type: nextType, negate: false, values: [] });
  };

  const changeOperator = (nextNegate: boolean) => onChange({ ...condition, negate: nextNegate });

  const toggleRole = (roleId: string) => {
    if (selectedRoleSet.has(roleId)) {
      setValues([...roleIds.filter(id => id !== roleId), ...userIds]);
      return;
    }
    if (roleIds.length + userIds.length >= max) return;
    setValues([...roleIds, roleId, ...userIds]);
  };

  const handleRemove = () => {
    if (values.length > 0) {
      setConfirmOpen(true);
      return;
    }
    onRemove();
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-start lg:flex-nowrap">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Condition field"
              disabled={disabled}
              className={cn(controlClass, 'w-full justify-between gap-2 md:w-44')}
            >
              <span className="flex min-w-0 items-center gap-2">
                <FieldIcon className="h-4 w-4 shrink-0 text-blue-400" />
                <span className="truncate">{field.label}</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-40"
          >
            {FIELD_OPTIONS.map(option => {
              const OptionIcon = option.icon;
              return (
                <DropdownMenuItem key={option.value} onSelect={() => changeField(option.value)}>
                  <OptionIcon className="h-4 w-4 text-slate-400" />
                  <span className="flex-1">{option.label}</span>
                  {option.value === type && <Check className="h-4 w-4 text-blue-400" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Condition operator"
              disabled={disabled}
              className={cn(
                controlClass,
                'w-full justify-between gap-2 md:flex-1 lg:w-40 lg:flex-none'
              )}
            >
              <span className="truncate">{operatorLabel(type, negate)}</span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-40"
          >
            {OPERATOR_OPTIONS[type].map(option => (
              <DropdownMenuItem
                key={String(option.negate)}
                onSelect={() => changeOperator(option.negate)}
              >
                <span className="flex-1">{option.label}</span>
                {option.negate === negate && <Check className="h-4 w-4 text-blue-400" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-full min-w-0 space-y-1.5 lg:w-auto lg:flex-1">
          {type === 'keyword' && (
            <>
              <TagInput
                values={values}
                onChange={setValues}
                disabled={disabled}
                maxItems={max}
                placeholder="Type a keyword, press Enter"
                transform={value => value.trim().toLowerCase()}
                validate={value => filterValueError('keyword', value)}
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
              disabled={disabled}
              maxItems={max}
              placeholder="Paste a webhook ID, press Enter"
              validate={value => filterValueError('webhook', value)}
            />
          )}

          {type === 'author' && (
            <>
              <TagInput
                values={values}
                onChange={setValues}
                disabled={disabled}
                maxItems={max}
                placeholder="Paste a user ID, press Enter"
                validate={value => filterValueError('author', value)}
              />
              <p className="text-xs text-slate-500">
                Enable Developer Mode in Discord, then right-click a user → Copy User ID.
              </p>
            </>
          )}

          {type === 'mention' && (
            <>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={disabled}
                    className="w-full justify-between border-slate-700 bg-slate-800/50 font-normal text-slate-300"
                  >
                    {roleIds.length > 0
                      ? `${roleIds.length} role${roleIds.length === 1 ? '' : 's'} selected`
                      : 'Select roles'}
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
                        className={cn('py-1.5', selected && 'bg-slate-800/60')}
                        onSelect={event => {
                          event.preventDefault();
                          toggleRole(role.id);
                        }}
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: hex ?? '#94a3b8' }}
                        />
                        <span className="flex-1 truncate">{role.name}</span>
                        {selected && <Check className="h-4 w-4 shrink-0 text-blue-400" />}
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
                        {!disabled && (
                          <button
                            type="button"
                            aria-label="Remove role"
                            onClick={() => toggleRole(id)}
                            className="text-slate-400 hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}

              <TagInput
                values={userIds}
                onChange={next => setValues([...roleIds, ...next])}
                disabled={disabled}
                maxItems={Math.max(0, max - roleIds.length)}
                placeholder="…or paste a user ID, press Enter"
                validate={value => filterValueError('mention', value)}
              />
              <p className="text-xs text-slate-500">
                {roleIds.length + userIds.length}/{max} mentions selected.
              </p>
            </>
          )}
        </div>

        {!disabled && (
          <button
            type="button"
            aria-label="Remove condition"
            onClick={handleRemove}
            className="mt-1 hidden shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400 lg:block"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {!disabled && (
        <div className="mt-2 flex justify-end lg:hidden">
          <button
            type="button"
            aria-label="Remove condition"
            onClick={handleRemove}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove condition
          </button>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this condition?</AlertDialogTitle>
            <AlertDialogDescription>
              This condition has {values.length} {values.length === 1 ? 'value' : 'values'}.
              Removing it can&apos;t be undone once you save.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-500"
              onClick={onRemove}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
