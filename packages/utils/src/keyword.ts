/**
 * Keyword matching for message filters.
 *
 * Discord-AutoMod-style semantics, regex-injection-safe by construction:
 * - `word`   matches the whole word only (bounded by any non-letter/digit char).
 * - `word*`  matches words that start with `word`.
 * - `*word`  matches words that end with `word`.
 * - `*word*` matches `word` anywhere (substring).
 *
 * User input never reaches the RegExp engine unescaped: every literal segment is
 * escaped and only `*` is re-introduced as a wildcard (`.*`).
 */

/** Word boundary = anything that is not a Unicode letter or number. */
const START_BOUNDARY = '(?<![\\p{L}\\p{N}])';
const END_BOUNDARY = '(?![\\p{L}\\p{N}])';

/** Escape every regex metacharacter so a literal segment matches itself. */
const escapeRegex = (segment: string): string => segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Compiled-pattern memo: keyword space is tiny, deterministic, and hot-path read. */
const patternCache = new Map<string, RegExp | null>();

/**
 * Compile a keyword into a matcher RegExp.
 * @returns the RegExp, or `null` for a no-op keyword (empty or only `*`).
 */
export const compileKeywordPattern = (keyword: string): RegExp | null => {
  const cached = patternCache.get(keyword);
  if (cached !== undefined) return cached;

  // Collapse runs of `*` so `**` behaves like `*` (and never yields `.*.*`).
  const trimmed = keyword.trim().replace(/\*+/g, '*');

  if (trimmed.length === 0 || trimmed === '*') {
    patternCache.set(keyword, null);
    return null;
  }

  const startsWithWildcard = trimmed.startsWith('*');
  const endsWithWildcard = trimmed.endsWith('*');

  // Split on `*` (the only special token); escape each literal chunk; rejoin with `.*`.
  const body = trimmed
    .split('*')
    .filter(segment => segment.length > 0)
    .map(escapeRegex)
    .join('.*');

  const source =
    (startsWithWildcard ? '' : START_BOUNDARY) + body + (endsWithWildcard ? '' : END_BOUNDARY);

  const pattern = new RegExp(source, 'iu');
  patternCache.set(keyword, pattern);
  return pattern;
};

/** Whether `content` matches a single keyword pattern. */
export const keywordMatches = (content: string, keyword: string): boolean =>
  compileKeywordPattern(keyword)?.test(content) ?? false;

/** Whether `content` matches any of the keywords (OR). */
export const anyKeywordMatches = (content: string, keywords: string[]): boolean =>
  keywords.some(keyword => keywordMatches(content, keyword));
