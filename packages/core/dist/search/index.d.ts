/**
 * Filter values are stable identifiers, never array indices: the mockup's
 * `fCats: [1]` is a position, which survives neither a shareable URL, nor a
 * saved search, nor the insertion of a discipline.
 */
/** The version of the criteria grammar: a saved search replays or declares itself stale. */
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
/** Normalises criteria so that two equivalent entries produce the same thing. */
export declare function normalizeSearchCriteria(criteria: SearchCriteria): SearchCriteria;
/**
 * The signature that answers "already saved" — canonical, not a hash: hashing
 * would need a platform API, which this package forbids itself, and it would be
 * unreadable in a log.
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
/** Replays a saved search against the current grammar, or declares it stale. */
export declare function migrateCriteria(criteria: SearchCriteria): CriteriaMigration;
export declare function assertKnownFlag(flag: string, knownFlags: readonly string[]): void;
//# sourceMappingURL=index.d.ts.map