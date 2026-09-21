/**
 * La normalisation des criteres de recherche, et leur SIGNATURE.
 *
 * `storefront-web` (forme 13) : la deduplication « deja enregistree » s'affiche
 * sur DEUX ecrans et determine une ECRITURE. La maquette la calcule cote
 * client : c'est donc une valeur de `@arthome/core`, normalisee une fois,
 * jamais deux.
 *
 * Et une exigence que rien ne portait : les valeurs de filtre sont des
 * IDENTIFIANTS STABLES, jamais des indices de tableau. La maquette filtre sur
 * `fCats: [1]` — une POSITION, qui ne survit ni a une URL partageable, ni a une
 * recherche enregistree, ni a l'insertion d'une discipline.
 */

import { DomainError } from '../kernel/errors.js';

/**
 * La VERSION de la grammaire des criteres.
 *
 * `storefront-web` Q24 : une recherche enregistree survit a des mois et a des
 * montees de version. Si la grammaire change, elle doit soit se rejouer a
 * l'identique, soit **se declarer perimee** — jamais disparaitre en silence.
 * Une serialisation opaque de l'etat d'ecran, comme celle de la maquette, ne le
 * permet pas.
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
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter((value) => value.length > 0))].sort();
}

/**
 * Normalise des criteres pour que DEUX SAISIES EQUIVALENTES produisent la meme
 * chose.
 *
 * Trois normalisations, et chacune corrige un cas reel :
 *   - les listes sont TRIEES et DEDUPLIQUEES — deux disciplines cochees dans
 *     deux ordres sont la meme recherche ;
 *   - le texte est reduit et mis en minuscules ;
 *   - un intervalle inverse est remis a l'endroit plutot que refuse : une
 *     recherche n'est pas un formulaire de paiement.
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

function orderedPair<T extends number | string>(left: T | null, right: T | null): readonly [T | null, T | null] {
  if (left === null || right === null) return [left, right];
  return left <= right ? [left, right] : [right, left];
}

/**
 * La SIGNATURE — ce qui repond « deja enregistree » sur deux ecrans.
 *
 * Deterministe et stable : elle ne depend ni de l'ordre de saisie, ni de la
 * casse, ni des espaces. C'est une representation canonique, pas un hachage :
 * un hachage aurait exige une source de hachage — donc une API de plateforme —
 * que ce paquet s'interdit, et il serait illisible dans un journal.
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

/** Ce qu'il advient d'une recherche enregistree apres un changement de grammaire. */
export type CriteriaMigration =
  | { readonly status: 'current'; readonly criteria: SearchCriteria }
  | { readonly status: 'migrated'; readonly criteria: SearchCriteria }
  | { readonly status: 'stale'; readonly fromVersion: number };

/**
 * Rejoue une recherche enregistree contre la grammaire courante.
 *
 * Elle se rejoue, ou elle **se declare perimee**. Jamais elle ne disparait, et
 * jamais elle ne s'execute en silence sur des criteres qu'elle ne comprend
 * plus — ce qui rendrait un compteur de correspondances faux sans que personne
 * le sache.
 */
export function migrateCriteria(criteria: SearchCriteria): CriteriaMigration {
  if (criteria.version === CRITERIA_VERSION) {
    return { status: 'current', criteria: normalizeSearchCriteria(criteria) };
  }
  if (criteria.version > CRITERIA_VERSION) {
    // Une version FUTURE : l'application est en retard sur le serveur. On ne
    // devine pas, on le dit.
    return { status: 'stale', fromVersion: criteria.version };
  }
  return { status: 'stale', fromVersion: criteria.version };
}

export function assertKnownFlag(flag: string, knownFlags: readonly string[]): void {
  if (!knownFlags.includes(flag)) {
    throw new DomainError({ code: 'search.unknown_flag', params: { flag } });
  }
}
