/**
 * Les droits territoriaux — et le motif est un CODE, jamais une phrase.
 *
 * `geography.rightsPolicy.note` le pose et la regle se porte telle quelle :
 * « une diffusion est MONDIALE PAR DEFAUT, une restriction territoriale est
 * l'exception, et elle se declare ». C'est l'inverse de la VOD, et c'est juste
 * pour du spectacle vivant.
 *
 * E8 — ce qui ne se porte pas : `blackoutReasons[]` porte `label` et `labelEn`,
 * du texte REDIGE DANS LA DONNEE, alors que tout le reste du vocabulaire passe
 * par `enums.*`. C'est une fuite d'i18n dans le modele, et elle est exactement
 * du genre que la decision « i18n par codes » existe pour interdire.
 */

import { BlackoutReason, RightsScope } from '../vocabulary/catalog.js';

export interface TerritoryRights {
  readonly scope: RightsScope;
  /** ISO 3166-1 alpha-2. Vide quand la portee est mondiale. */
  readonly blackoutCountries: readonly string[];
  /** Un CODE. Nul quand la portee est mondiale. */
  readonly reason: BlackoutReason | null;
}

export function worldwideRights(): TerritoryRights {
  return { scope: RightsScope.WORLDWIDE, blackoutCountries: [], reason: null };
}

export function restrictedRights(
  blackoutCountries: readonly string[],
  reason: BlackoutReason,
): TerritoryRights {
  return { scope: RightsScope.RESTRICTED, blackoutCountries, reason };
}

/**
 * Le spectateur peut-il voir depuis ce pays ?
 *
 * ⚠ Le pays est un ARGUMENT, jamais un global. `helpers.js` lit
 * `viewerCountry` au niveau du module, avec un `setViewerCountry()` — deux
 * requetes concurrentes d'un service partageraient le meme pays.
 *
 * ⚠ Et le pays se RESOUT A CHAQUE OUVERTURE, jamais depuis une projection : il
 * change entre deux lectures — deplacement, itinerance, reseau d'entreprise —
 * et sur mobile ce delai se compte en heures.
 */
export function isAvailableIn(rights: TerritoryRights, viewerCountry: string): boolean {
  if (rights.scope === RightsScope.WORLDWIDE) return true;
  return !rights.blackoutCountries.includes(viewerCountry.toUpperCase());
}

/**
 * Le motif du refus, en CODE — a servir avec l'erreur.
 *
 * `storefront-mobile` le demande explicitement : le texte promet que « les
 * autres dates de ce spectacle restent accessibles », donc l'erreur doit
 * porter le motif ET de quoi tenir la promesse. Une erreur qui promet une issue
 * sans la porter oblige le client a une seconde requete au pire moment.
 */
export function blackoutReasonOf(
  rights: TerritoryRights,
  viewerCountry: string,
): BlackoutReason | null {
  return isAvailableIn(rights, viewerCountry) ? null : rights.reason;
}
