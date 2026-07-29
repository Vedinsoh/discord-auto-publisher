import type { SegmentedOption } from '@/components/ui/segmented-control';
import type { FilterMatchMode, FilterType } from '@/lib/api/types';

/** Field label shown in the condition-row field dropdown. */
export const FILTER_TYPE_LABELS: Record<FilterType, string> = {
  keyword: 'Keyword',
  mention: 'Mention',
  author: 'Author',
  webhook: 'Webhook',
};

/** Plain-English label for the value input, per filter type. */
export const FILTER_VALUE_LABELS: Record<FilterType, string> = {
  keyword: 'Keywords',
  mention: 'Roles & users',
  author: 'User IDs',
  webhook: 'Webhook IDs',
};

/** Per-field operator option; `negate` is the stored value. */
export interface OperatorOption {
  negate: boolean;
  label: string;
}

/**
 * Per-field operator choices (positive first). The negative form replaces the
 * old allow/block split — a negated condition is "block this".
 */
export const OPERATOR_OPTIONS: Record<FilterType, [OperatorOption, OperatorOption]> = {
  keyword: [
    { negate: false, label: 'contains' },
    { negate: true, label: "doesn't contain" },
  ],
  author: [
    { negate: false, label: 'is' },
    { negate: true, label: 'is not' },
  ],
  mention: [
    { negate: false, label: 'mentions' },
    { negate: true, label: "doesn't mention" },
  ],
  webhook: [
    { negate: false, label: 'is' },
    { negate: true, label: 'is not' },
  ],
};

/** Human-readable operator for a condition. */
export function operatorLabel(type: FilterType, negate: boolean): string {
  return OPERATOR_OPTIONS[type].find(option => option.negate === negate)?.label ?? '';
}

/** Wildcard cheatsheet shown under the keyword input. */
export const KEYWORD_WILDCARD_EXAMPLES: { pattern: string; hint: string }[] = [
  { pattern: 'spam*', hint: 'starts with' },
  { pattern: '*spam', hint: 'ends with' },
  { pattern: '*spam*', hint: 'contains' },
];

/** Mirror of the backend refine: a keyword that is empty or only `*` is a no-op. */
export function isNoOpKeyword(value: string): boolean {
  const collapsed = value.trim().replace(/\*+/g, '*');
  return collapsed.length === 0 || collapsed === '*';
}

/**
 * Per-channel condition cap. Deliberately not surfaced in the UI (no badge or
 * limit copy) — the builder blocks adding past it with a toast, and the backend
 * enforces it too. Mirrors config.limits.filtersPerChannel.
 */
export const MAX_FILTERS_PER_CHANNEL = 50;

/** Per-type value caps (mirror CreateFilterSchema's refine on the backend). */
export const MAX_VALUES: Record<FilterType, number> = {
  keyword: 20,
  mention: 10,
  author: 10,
  webhook: 10,
};

export const FILTER_TYPE_OPTIONS: SegmentedOption<FilterType>[] = [
  { value: 'keyword', label: 'Keyword' },
  { value: 'mention', label: 'Mention' },
  { value: 'author', label: 'Author' },
  { value: 'webhook', label: 'Webhook' },
];

/** All = every condition must hold (default), Any = at least one. */
export const MATCH_MODE_OPTIONS: SegmentedOption<FilterMatchMode>[] = [
  { value: 'all', label: 'All' },
  { value: 'any', label: 'Any' },
];

/** Default match mode for a channel with conditions. */
export const DEFAULT_MATCH_MODE: FilterMatchMode = 'all';

/** Discord snowflake: 17-20 digits. */
export const SNOWFLAKE_REGEX = /^\d{17,20}$/;

/**
 * Per-type value check, shared by the chip inputs (flag invalid chips in red) and
 * the rule editor (drop flagged values from the save payload). Invalid values are
 * never discarded on entry — the user gets to fix them.
 */
export function filterValueError(type: FilterType, value: string): string | null {
  if (type === 'keyword') {
    if (value.length > 200) return 'Keyword is too long (max 200 chars)';
    return isNoOpKeyword(value) ? 'Keyword cannot be empty or only wildcards' : null;
  }
  if (SNOWFLAKE_REGEX.test(value)) return null;
  return type === 'webhook'
    ? 'Enter a valid webhook ID (17-20 digits)'
    : 'Enter a valid user ID (17-20 digits)';
}

/** Discord role color int → CSS hex; 0 means "no color" (default). */
export function roleColorHex(color: number): string | null {
  return color === 0 ? null : `#${color.toString(16).padStart(6, '0')}`;
}
