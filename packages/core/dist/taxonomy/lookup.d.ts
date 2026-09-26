/**
 * The rules for reading the taxonomy. All of them take the artefact as an ARGUMENT: `helpers.js`
 * wrote them against a global index, which a package imported by seven services cannot carry.
 */
import type { Discipline, Genre, Tag, Taxonomy } from './types.js';
/**
 * The disciplines in the declared EDITORIAL RANK, from the most popular to the most specialised,
 * families mixed.
 *
 * The copy is deliberate: `sort` mutates in place and the served artefact is process-wide.
 */
export declare function disciplinesInEditorialOrder(taxonomy: Taxonomy): readonly Discipline[];
/** A universe's disciplines, in editorial rank. */
export declare function disciplinesOfFamily(taxonomy: Taxonomy, familyId: string): readonly Discipline[];
export declare function findDiscipline(taxonomy: Taxonomy, disciplineId: string): Discipline | null;
/**
 * A sub-genre is looked up WITHIN ITS DISCIPLINE: two disciplines can carry one of the same name —
 * `contemporary` exists in theatre and in dance.
 */
export declare function findGenre(taxonomy: Taxonomy, disciplineId: string, genreId: string): Genre | null;
export declare function genreIdsOf(taxonomy: Taxonomy, disciplineId: string): readonly string[];
export declare function findTag(taxonomy: Taxonomy, tagId: string): Tag | null;
/** Does a tag match a free-text term? The identifier AND the aliases, accents and case aside. */
export declare function matchesTag(tag: Tag, term: string): boolean;
/**
 * Normalises a term for comparison: lowercase, no accents, no separating punctuation.
 *
 * `normalize('NFD')` is ECMAScript, not a browser API: it works under Node, Metro and Hermes, which
 * is what lets us stay free of `Intl`.
 */
export declare function normalizeTerm(term: string): string;
/** What a free-text term designated in the taxonomy. */
export interface TermMatch {
    readonly kind: 'discipline' | 'genre' | 'tag';
    readonly id: string;
    /** Filled in for a sub-genre: its discipline. */
    readonly disciplineId: string | null;
}
/**
 * Resolves a free-text term into a taxonomic reference.
 *
 * Decreasing specificity: discipline, then sub-genre, then tag. "jazz" is a discipline AND could be
 * a style tag; the discipline must win, or a search for it returns a handful of tagged dates.
 */
export declare function resolveTerm(taxonomy: Taxonomy, term: string): TermMatch | null;
//# sourceMappingURL=lookup.d.ts.map