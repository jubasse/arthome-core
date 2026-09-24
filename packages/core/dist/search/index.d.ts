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
/**
 * The VERSION of the criteria grammar.
 *
 * `storefront-web` Q24: a saved search survives months and version upgrades. If
 * the grammar changes, it must either replay identically or **declare itself
 * stale** — never vanish in silence. An opaque serialisation of screen state,
 * like the mockup's, does not allow that.
 */
export declare const CRITERIA_VERSION = 1;
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
export declare function emptyCriteria(): SearchCriteria;
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
export declare function normalizeSearchCriteria(criteria: SearchCriteria): SearchCriteria;
/**
 * The SIGNATURE — what answers "already saved" on two screens.
 *
 * Deterministic and stable: it depends on neither entry order, nor case, nor
 * whitespace. It is a canonical representation, not a hash: a hash would have
 * required a hashing source — hence a platform API — which this package forbids
 * itself, and it would be unreadable in a log.
 */
export declare function criteriaSignature(criteria: SearchCriteria): string;
export declare function sameCriteria(left: SearchCriteria, right: SearchCriteria): boolean;
/** What becomes of a saved search after a grammar change. */
export type CriteriaMigration = {
    readonly status: 'current';
    readonly criteria: SearchCriteria;
} | {
    readonly status: 'migrated';
    readonly criteria: SearchCriteria;
} | {
    readonly status: 'stale';
    readonly fromVersion: number;
};
/**
 * Replays a saved search against the current grammar.
 *
 * It replays, or it **declares itself stale**. It never vanishes, and it never
 * runs in silence on criteria it no longer understands — which would make a
 * match counter wrong with nobody knowing.
 */
export declare function migrateCriteria(criteria: SearchCriteria): CriteriaMigration;
export declare function assertKnownFlag(flag: string, knownFlags: readonly string[]): void;
//# sourceMappingURL=index.d.ts.map