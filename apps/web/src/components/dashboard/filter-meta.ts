import type { SegmentedOption } from '@/components/ui/segmented-control';
import type { FilterMatchMode, FilterMode, FilterType } from '@/lib/api/types';

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
