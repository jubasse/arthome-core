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
export function disciplinesInEditorialOrder(taxonomy: Taxonomy): readonly Discipline[] {
  return [...taxonomy.disciplines].sort((left, right) => left.rank - right.rank);
}

/** A universe's disciplines, in editorial rank. */
export function disciplinesOfFamily(taxonomy: Taxonomy, familyId: string): readonly Discipline[] {
  return disciplinesInEditorialOrder(taxonomy).filter(
    (discipline) => discipline.familyId === familyId,
  );
}

export function findDiscipline(taxonomy: Taxonomy, disciplineId: string): Discipline | null {
  return taxonomy.disciplines.find((discipline) => discipline.id === disciplineId) ?? null;
}

/**
 * A sub-genre is looked up WITHIN ITS DISCIPLINE.
 *
 * `helpers.js` exposed `genre(id)` with a single argument, and the studio
 * mockup called it that way while the function expects two — a defect reported
 * by `studio-web` (inconsistency 10). Two disciplines can carry a sub-genre of
 * the same name: `contemporary` exists in theatre and in dance.
 */
export function findGenre(taxonomy: Taxonomy, disciplineId: string, genreId: string): Genre | null {
  const discipline = findDiscipline(taxonomy, disciplineId);
  return discipline?.genres.find((genre) => genre.id === genreId) ?? null;
}

export function genreIdsOf(taxonomy: Taxonomy, disciplineId: string): readonly string[] {
  return findDiscipline(taxonomy, disciplineId)?.genres.map((genre) => genre.id) ?? [];
}

export function findTag(taxonomy: Taxonomy, tagId: string): Tag | null {
  return taxonomy.tags.find((tag) => tag.id === tagId) ?? null;
}

/**
 * Does a tag match a free-text term?
 *
 * Compares the identifier AND the aliases, insensitive to case and accents —
 * "opera" must find "opéra". It is the same normalisation as search, and it
 * lives here so it is written only once.
 */
export function matchesTag(tag: Tag, term: string): boolean {
  const needle = normalizeTerm(term);
  if (!needle) return false;
  if (normalizeTerm(tag.id) === needle) return true;
  return tag.aliases.some((alias) => normalizeTerm(alias) === needle);
}

/**
 * Normalises a term for comparison: lowercase, no accents, no separating
 * punctuation.
 *
 * `normalize('NFD')` is ECMAScript, not a browser API: available under Node,
 * Metro and Hermes. That is what allows us to stay free of `Intl`.
 */
export function normalizeTerm(term: string): string {
  return term
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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
export function resolveTerm(taxonomy: Taxonomy, term: string): TermMatch | null {
  const needle = normalizeTerm(term);
  if (!needle) return null;

  const discipline = taxonomy.disciplines.find((entry) => normalizeTerm(entry.id) === needle);
  if (discipline) return { kind: 'discipline', id: discipline.id, disciplineId: null };

  for (const entry of taxonomy.disciplines) {
    const genre = entry.genres.find((candidate) => normalizeTerm(candidate.id) === needle);
    if (genre) return { kind: 'genre', id: genre.id, disciplineId: entry.id };
  }

  const tag = taxonomy.tags.find((candidate) => matchesTag(candidate, term));
  return tag ? { kind: 'tag', id: tag.id, disciplineId: null } : null;
}
