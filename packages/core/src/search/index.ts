/**
 * ⚠ Filter values are stable identifiers, never array indices: the mockup's
 * `fCats: [1]` is a position, which survives neither a shareable URL, nor a
 * saved search, nor the insertion of a discipline.
 */

import { DomainError } from '../kernel/errors.js';
import { DomainErrorCode } from '../vocabulary/error-codes.js';

/** The version of the criteria grammar: a saved search replays or declares itself stale. */
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

/** Normalises criteria so that two equivalent entries produce the same thing. */
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
 * The signature that answers "already saved" — canonical, not a hash: hashing
 * would need a platform API, which this package forbids itself, and it would be
 * unreadable in a log.
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

/** Replays a saved search against the current grammar, or declares it stale. */
export function migrateCriteria(criteria: SearchCriteria): CriteriaMigration {
  if (criteria.version === CRITERIA_VERSION) {
    return { status: 'current', criteria: normalizeSearchCriteria(criteria) };
  }
  if (criteria.version > CRITERIA_VERSION) {
    // A future version means the application is behind the server: no guessing.
    return { status: 'stale', fromVersion: criteria.version };
  }
  return { status: 'stale', fromVersion: criteria.version };
}

export function assertKnownFlag(flag: string, knownFlags: readonly string[]): void {
  if (!knownFlags.includes(flag)) {
    throw new DomainError({ code: DomainErrorCode.SEARCH_UNKNOWN_FLAG, params: { flag } });
  }
}
