import { FilterMatchMode, type FilterType, FilterType as FilterTypes } from '@ap/validations';

/**
 * Condition wording shared by the panel and its forms. Mirrors the dashboard's
 * rule editor (`apps/web/.../condition-row.tsx` + `filter-meta.ts`) verbatim so a
 * rule reads the same in Discord and on the web — note `keyword` reads as
 * "Content", which is what the dashboard's field dropdown shows.
 */
export const FIELD_LABELS: Record<FilterType, string> = {
  [FilterTypes.Keyword]: 'Content',
  [FilterTypes.Author]: 'Author',
  [FilterTypes.Mention]: 'Mention',
  [FilterTypes.Webhook]: 'Webhook',
};

/** What each field matches — shown in the type select and atop the condition form. */
export const FIELD_DESCRIPTIONS: Record<FilterType, string> = {
  [FilterTypes.Keyword]: 'Match words in the message',
  [FilterTypes.Author]: 'Match the message author',
  [FilterTypes.Mention]: 'Match mentioned roles or users',
  [FilterTypes.Webhook]: 'Match the posting webhook',
};

/** Field order, as the dashboard's field dropdown lists them. */
export const FIELD_ORDER: readonly FilterType[] = [
  FilterTypes.Keyword,
  FilterTypes.Author,
  FilterTypes.Mention,
  FilterTypes.Webhook,
];

/**
 * Per-field operator wording. `negate: false` uses `positive`, `true` uses `negative`.
 * Replaces the old allow/block mode — a negated condition is "block this".
 */
export const OPERATOR_LABELS: Record<FilterType, { positive: string; negative: string }> = {
  [FilterTypes.Keyword]: { positive: 'contains', negative: "doesn't contain" },
  [FilterTypes.Author]: { positive: 'is', negative: 'is not' },
  [FilterTypes.Mention]: { positive: 'mentions', negative: "doesn't mention" },
  [FilterTypes.Webhook]: { positive: 'is', negative: 'is not' },
};

/** Human-readable operator for a condition. */
export const operatorLabel = (type: FilterType, negate: boolean): string =>
  negate ? OPERATOR_LABELS[type].negative : OPERATOR_LABELS[type].positive;

/** Match-mode wording, as the dashboard's segmented control shows it. */
export const MODE_LABELS: Record<FilterMatchMode, string> = {
  [FilterMatchMode.All]: 'All',
  [FilterMatchMode.Any]: 'Any',
};

/**
 * Per-type value caps. Re-exported from the schema package rather than mirrored, so
 * the panel can never drift from what the backend accepts — tune them there.
 */
export { MAX_VALUES } from '@ap/validations';
