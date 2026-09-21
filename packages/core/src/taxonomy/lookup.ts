/**
 * Les regles de lecture de la taxonomie.
 *
 * Toutes prennent l'artefact en ARGUMENT. `helpers.js` les ecrivait contre un
 * index global (`byId.category`, `byId.genre`), ce qui est precisement l'etat
 * global qu'un paquet importe par sept services ne peut pas porter.
 */

import type { Discipline, Genre, Tag, Taxonomy } from './types.js';

/**
 * Les disciplines dans le RANG EDITORIAL declare, du plus grand public au plus
 * pointu, familles melees.
 *
 * B1 — le cahier des charges TV annoncait « les neuf disciplines » ; il y en a
 * VINGT ET UNE (14 en Musique, 7 en Scene). Neuf tuiles tiennent sur un
 * televiseur, vingt et une non — c'est une contrainte de mise en page qui
 * remonte jusqu'au modele de lecture, et la reponse est le groupement par
 * univers, pas un tri invente par la surface.
 *
 * La copie est deliberee : `sort` mute en place, et muter l'artefact servi
 * serait un effet de bord sur une donnee partagee par tout le processus.
 */
export function disciplinesInEditorialOrder(taxonomy: Taxonomy): readonly Discipline[] {
  return [...taxonomy.disciplines].sort((left, right) => left.rank - right.rank);
}

/** Les disciplines d'un univers, dans le rang editorial. */
export function disciplinesOfFamily(taxonomy: Taxonomy, familyId: string): readonly Discipline[] {
  return disciplinesInEditorialOrder(taxonomy).filter(
    (discipline) => discipline.familyId === familyId,
  );
}

export function findDiscipline(taxonomy: Taxonomy, disciplineId: string): Discipline | null {
  return taxonomy.disciplines.find((discipline) => discipline.id === disciplineId) ?? null;
}

/**
 * Un sous-genre se cherche DANS SA DISCIPLINE.
 *
 * `helpers.js` exposait `genre(id)` a un seul argument, et la maquette du
 * studio l'appelait ainsi alors que la fonction en attend deux — un defaut
 * releve par `studio-web` (incoherence 10). Deux disciplines peuvent porter un
 * sous-genre du meme nom : `contemporary` existe en theatre et en danse.
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
 * Une etiquette correspond-elle a un terme libre ?
 *
 * Compare l'identifiant ET les alias, insensible a la casse et aux accents —
 * « opera » doit trouver « opéra ». C'est la meme normalisation que la
 * recherche, et elle vit ici pour n'etre ecrite qu'une fois.
 */
export function matchesTag(tag: Tag, term: string): boolean {
  const needle = normalizeTerm(term);
  if (!needle) return false;
  if (normalizeTerm(tag.id) === needle) return true;
  return tag.aliases.some((alias) => normalizeTerm(alias) === needle);
}

/**
 * Normalise un terme pour la comparaison : minuscules, sans accents, sans
 * ponctuation de separation.
 *
 * `normalize('NFD')` est de l'ECMAScript, pas une API navigateur : disponible
 * sous Node, Metro et Hermes. C'est ce qui permet de rester sans `Intl`.
 */
export function normalizeTerm(term: string): string {
  return term
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Ce qu'un terme libre a designe dans la taxonomie. */
export interface TermMatch {
  readonly kind: 'discipline' | 'genre' | 'tag';
  readonly id: string;
  /** Renseigne pour un sous-genre : sa discipline. */
  readonly disciplineId: string | null;
}

/**
 * Resout un terme libre en une reference taxonomique.
 *
 * L'ordre de recherche est celui de la specificite decroissante : une
 * discipline d'abord, puis un sous-genre, puis une etiquette. Il n'est pas
 * arbitraire — « jazz » est une discipline ET pourrait etre une etiquette de
 * style ; c'est la discipline qui doit gagner, sinon une recherche sur « jazz »
 * rend une poignee de dates etiquetees au lieu de la discipline entiere.
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
