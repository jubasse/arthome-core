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
 * A sub-genre is looked up WITHIN ITS DISCIPLINE: two disciplines can carry one of the same name —
 * `contemporary` exists in theatre and in dance.
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

/** Does a tag match a free-text term? The identifier AND the aliases, accents and case aside. */
export function matchesTag(tag: Tag, term: string): boolean {
  const needle = normalizeTerm(term);
  if (!needle) return false;
  if (normalizeTerm(tag.id) === needle) return true;
  return tag.aliases.some((alias) => normalizeTerm(alias) === needle);
}

/**
 * Normalises a term for comparison: lowercase, no accents, no separating punctuation.
 *
 * `normalize('NFD')` is ECMAScript, not a browser API: it works under Node, Metro and Hermes, which
 * is what lets us stay free of `Intl`.
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
 * Decreasing specificity: discipline, then sub-genre, then tag. "jazz" is a discipline AND could be
 * a style tag; the discipline must win, or a search for it returns a handful of tagged dates.
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
