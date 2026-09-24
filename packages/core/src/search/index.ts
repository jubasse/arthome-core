/**
 * Normalising search criteria, and their SIGNATURE.
 *
 * `storefront-web` (shape 13): the "already saved" deduplication appears on TWO
 * screens and determines a WRITE. The mockup computes it client-side: so it is
 * a value of `@arthome/core`, normalised once, never twice.
 *
 * And a requirement nothing carried: filter values are STABLE IDENTIFIERS,
 * never array indices. The mockup filters on `fCats: [1]` — a POSITION, which
 * survives neither a shareable URL, nor a saved search, nor the insertion of a
 * discipline.
 */

import { DomainError } from '../kernel/errors.js';
import { DomainErrorCode } from '../vocabulary/error-codes.js';

/**
 * The VERSION of the criteria grammar.
 *
 * `storefront-web` Q24: a saved search survives months and version upgrades. If
 * the grammar changes, it must either replay identically or **declare itself
 * stale** — never vanish in silence. An opaque serialisation of screen state,
 * like the mockup's, does not allow that.
 */
export const CRITERIA_VERSION = 1;

export interface SearchCriteria {
  readonly version: number;
  readonly text: string;
  readonly disciplineIds: readonly string[];
  readonly genreIds: readonly string[];
  readonly tagIds: readonly string[];
  readonly priceMinMinor: number | null;
  readonly priceMaxMinor: number | null;
  readonly fromInstant: string | null;
  readonly toInstant: string | null;
  readonly flags: readonly string[];
}

export function emptyCriteria(): SearchCriteria {
  return {
    version: CRITERIA_VERSION,
    text: '',
    disciplineIds: [],
    genreIds: [],
    tagIds: [],
    priceMinMinor: null,
    priceMaxMinor: null,
    fromInstant: null,
    toInstant: null,
    flags: [],
  };
}

function normalizeList(values: readonly string[]): readonly string[] {
  return [
    ...new Set(
      values.map((value) => value.trim().toLowerCase()).filter((value) => value.length > 0),
    ),
  ].sort();
}

/**
 * Normalises criteria so that TWO EQUIVALENT ENTRIES produce the same thing.
 *
 * Three normalisations, and each corrects a real case:
 *   - lists are SORTED and DEDUPLICATED — two disciplines ticked in two orders
 *     are the same search;
 *   - the text is collapsed and lowercased;
 *   - an inverted range is put back the right way round rather than refused: a
 *     search is not a payment form.
 */
export function normalizeSearchCriteria(criteria: SearchCriteria): SearchCriteria {
  const [priceMin, priceMax] = orderedPair(criteria.priceMinMinor, criteria.priceMaxMinor);
  const [from, to] = orderedPair(criteria.fromInstant, criteria.toInstant);
  return {
    version: CRITERIA_VERSION,
    text: criteria.text.trim().replace(/\s+/g, ' ').toLowerCase(),
    disciplineIds: normalizeList(criteria.disciplineIds),
    genreIds: normalizeList(criteria.genreIds),
    tagIds: normalizeList(criteria.tagIds),
    priceMinMinor: priceMin,
    priceMaxMinor: priceMax,
    fromInstant: from,
    toInstant: to,
    flags: normalizeList(criteria.flags),
  };
}

function orderedPair<T extends number | string>(
  left: T | null,
  right: T | null,
): readonly [T | null, T | null] {
  if (left === null || right === null) return [left, right];
  return left <= right ? [left, right] : [right, left];
}

/**
 * The SIGNATURE — what answers "already saved" on two screens.
 *
 * Deterministic and stable: it depends on neither entry order, nor case, nor
 * whitespace. It is a canonical representation, not a hash: a hash would have
 * required a hashing source — hence a platform API — which this package forbids
 * itself, and it would be unreadable in a log.
 */
export function criteriaSignature(criteria: SearchCriteria): string {
  const normalized = normalizeSearchCriteria(criteria);
  const parts = [
    `v${String(normalized.version)}`,
    `q:${normalized.text}`,
    `d:${normalized.disciplineIds.join(',')}`,
    `g:${normalized.genreIds.join(',')}`,
    `t:${normalized.tagIds.join(',')}`,
    `p:${normalized.priceMinMinor ?? ''}-${normalized.priceMaxMinor ?? ''}`,
    `w:${normalized.fromInstant ?? ''}-${normalized.toInstant ?? ''}`,
    `f:${normalized.flags.join(',')}`,
  ];
  return parts.join('|');
}

export function sameCriteria(left: SearchCriteria, right: SearchCriteria): boolean {
  return criteriaSignature(left) === criteriaSignature(right);
}

/** What becomes of a saved search after a grammar change. */
export type CriteriaMigration =
  | { readonly status: 'current'; readonly criteria: SearchCriteria }
  | { readonly status: 'migrated'; readonly criteria: SearchCriteria }
  | { readonly status: 'stale'; readonly fromVersion: number };

/**
 * Replays a saved search against the current grammar.
 *
 * It replays, or it **declares itself stale**. It never vanishes, and it never
 * runs in silence on criteria it no longer understands — which would make a
 * match counter wrong with nobody knowing.
 */
export function migrateCriteria(criteria: SearchCriteria): CriteriaMigration {
  if (criteria.version === CRITERIA_VERSION) {
    return { status: 'current', criteria: normalizeSearchCriteria(criteria) };
  }
  if (criteria.version > CRITERIA_VERSION) {
    // A FUTURE version: the application is behind the server. We do not guess,
    // we say so.
    return { status: 'stale', fromVersion: criteria.version };
  }
  return { status: 'stale', fromVersion: criteria.version };
}

export function assertKnownFlag(flag: string, knownFlags: readonly string[]): void {
  if (!knownFlags.includes(flag)) {
    throw new DomainError({ code: DomainErrorCode.SEARCH_UNKNOWN_FLAG, params: { flag } });
  }
}
