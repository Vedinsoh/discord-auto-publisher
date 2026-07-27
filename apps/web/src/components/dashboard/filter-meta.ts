import type { SegmentedOption } from '@/components/ui/segmented-control';
import type { FilterMatchMode, FilterMode, FilterType } from '@/lib/api/types';

/** Plain-English label for the value input, per filter type. */
export const FILTER_VALUE_LABELS: Record<FilterType, string> = {
  keyword: 'Keywords',
  mention: 'Roles & users',
  author: 'User IDs',
  webhook: 'Webhook IDs',
};

/** The "…any of these X" fragment used to build a filter's plain-English sentence. */
const FILTER_TARGET: Record<FilterType, string> = {
  keyword: 'containing any of these words',
  mention: 'that mention any of these',
  author: 'from any of these authors',
  webhook: 'from any of these webhooks',
};

/**
 * A one-line description of what a filter does. Block rules speak in absolutes;
 * allow rules describe what the single rule matches (they combine per the
 * channel's Any/All setting, explained at the section level).
 */
export function filterSentence(mode: FilterMode, type: FilterType): string {
  return mode === 'block'
    ? `Messages ${FILTER_TARGET[type]} will not be published.`
    : `Matches messages ${FILTER_TARGET[type]}.`;
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

/** Mirrors config.limits.filtersPerChannel on the backend. */
export const MAX_FILTERS_PER_CHANNEL = 5;

/** Per-type value caps (mirror CreateFilterSchema's refine on the backend). */
export const MAX_VALUES: Record<FilterType, number> = {
  keyword: 20,
  mention: 10,
  author: 10,
  webhook: 10,
};

export const FILTER_TYPE_LABELS: Record<FilterType, string> = {
  keyword: 'Keyword',
  mention: 'Mention',
  author: 'Author',
  webhook: 'Webhook',
};

export const FILTER_TYPE_OPTIONS: SegmentedOption<FilterType>[] = [
  { value: 'keyword', label: 'Keyword' },
  { value: 'mention', label: 'Mention' },
  { value: 'author', label: 'Author' },
  { value: 'webhook', label: 'Webhook' },
];

export const FILTER_MODE_OPTIONS: SegmentedOption<FilterMode>[] = [
  { value: 'allow', label: 'Allow' },
  { value: 'block', label: 'Block' },
];

export const MATCH_MODE_OPTIONS: SegmentedOption<FilterMatchMode>[] = [
  { value: 'any', label: 'Any' },
  { value: 'all', label: 'All' },
];

/** Discord snowflake: 17-20 digits. */
export const SNOWFLAKE_REGEX = /^\d{17,20}$/;

/** Discord role color int → CSS hex; 0 means "no color" (default). */
export function roleColorHex(color: number): string | null {
  return color === 0 ? null : `#${color.toString(16).padStart(6, '0')}`;
}
