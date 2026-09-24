/**
 * The rules for reading the taxonomy.
 *
 * All of them take the artefact as an ARGUMENT. `helpers.js` wrote them against
 * a global index (`byId.category`, `byId.genre`), which is exactly the global
 * state a package imported by seven services cannot carry.
 */
import type { Discipline, Genre, Tag, Taxonomy } from './types.js';
/**
 * The disciplines in the declared EDITORIAL RANK, from the most popular to the
 * most specialised, families mixed.
 *
 * B1 — the TV brief announced "the nine disciplines"; there are TWENTY-ONE
 * (14 in Music, 7 in Stage). Nine tiles fit on a television, twenty-one do not
 * — a layout constraint that reaches all the way up to the reading model, and
 * the answer is grouping by universe, not a sort invented by the surface.
 *
 * The copy is deliberate: `sort` mutates in place, and mutating the served
 * artefact would be a side effect on data shared by the whole process.
 */
export declare function disciplinesInEditorialOrder(taxonomy: Taxonomy): readonly Discipline[];
/** A universe's disciplines, in editorial rank. */
export declare function disciplinesOfFamily(taxonomy: Taxonomy, familyId: string): readonly Discipline[];
export declare function findDiscipline(taxonomy: Taxonomy, disciplineId: string): Discipline | null;
/**
 * A sub-genre is looked up WITHIN ITS DISCIPLINE.
 *
 * `helpers.js` exposed `genre(id)` with a single argument, and the studio
 * mockup called it that way while the function expects two — a defect reported
 * by `studio-web` (inconsistency 10). Two disciplines can carry a sub-genre of
 * the same name: `contemporary` exists in theatre and in dance.
 */
export declare function findGenre(taxonomy: Taxonomy, disciplineId: string, genreId: string): Genre | null;
export declare function genreIdsOf(taxonomy: Taxonomy, disciplineId: string): readonly string[];
export declare function findTag(taxonomy: Taxonomy, tagId: string): Tag | null;
/**
 * Does a tag match a free-text term?
 *
 * Compares the identifier AND the aliases, insensitive to case and accents —
 * "opera" must find "opéra". It is the same normalisation as search, and it
 * lives here so it is written only once.
 */
export declare function matchesTag(tag: Tag, term: string): boolean;
/**
 * Normalises a term for comparison: lowercase, no accents, no separating
 * punctuation.
 *
 * `normalize('NFD')` is ECMAScript, not a browser API: available under Node,
 * Metro and Hermes. That is what allows us to stay free of `Intl`.
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
 * The lookup order is that of decreasing specificity: a discipline first, then
 * a sub-genre, then a tag. It is not arbitrary — "jazz" is a discipline AND
 * could be a style tag; the discipline must win, otherwise a search for "jazz"
 * returns a handful of tagged dates instead of the whole discipline.
 */
export declare function resolveTerm(taxonomy: Taxonomy, term: string): TermMatch | null;
//# sourceMappingURL=lookup.d.ts.map