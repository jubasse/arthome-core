/**
 * La langue d'un spectacle : ce qui est joue, sous-titre, surtitre — et si
 * l'on peut suivre sans comprendre.
 *
 * D1 — LA CORRECTION LA PLUS VERIFIABLE DU DOSSIER. `taxonomy.json` declare le
 * vocabulaire `none | light | helpful`. Or :
 *   - `essential` est ABSENTE du vocabulaire et employee par cinq spectacles ;
 *   - elle est traduite dans `i18n/storefront.json` ;
 *   - et `helpers.js:437` EN FAIT SON TEST : `languageDependency(show) === 'essential'` ;
 *   - tandis que `light` n'est employee NULLE PART.
 *
 * Un vocabulaire ferme qui ne contient pas la valeur dont depend la regle la
 * plus visible de la surface n'est pas un vocabulaire ferme. Le vocabulaire
 * reel est `none | helpful | essential`, et il est corrige au portage.
 */

import { LanguageDependency } from '../vocabulary/catalog.js';

/** Les INGREDIENTS. La phrase se compose a la surface, avec sa langue. */
export interface LanguageProfile {
  /** Codes BCP 47 de la langue JOUEE — distincte de la langue d'affichage. */
  readonly spoken: readonly string[];
  readonly subtitles: readonly string[];
  readonly surtitles: readonly string[];
  readonly dependency: LanguageDependency;
}

/**
 * Y a-t-il une barriere de langue ?
 *
 * Le test de `helpers.hasLanguageBarrier`, porte tel quel — c'est la regle la
 * plus visible de la surface, et elle ne tient qu'a `essential`.
 */
export function hasLanguageBarrier(profile: LanguageProfile): boolean {
  return profile.dependency === LanguageDependency.ESSENTIAL;
}

/**
 * Ce spectacle est-il suivable avec les langues que je comprends ?
 *
 * Trois chemins, dans cet ordre :
 *   - la langue ne compte pas (`none`) : oui, toujours ;
 *   - je comprends la langue jouee : oui ;
 *   - un sous-titrage ou un surtitrage me couvre : oui.
 * Sinon, la reponse depend de la dependance — `helpful` reste suivable, c'est
 * tout le sens de la valeur intermediaire.
 */
export function isUnderstandable(
  profile: LanguageProfile,
  understoodLanguages: readonly string[],
): boolean {
  if (profile.dependency === LanguageDependency.NONE) return true;

  const understood = new Set(understoodLanguages.map((code) => code.toLowerCase()));
  const covers = (codes: readonly string[]): boolean =>
    codes.some((code) => understood.has(code.toLowerCase()));

  if (covers(profile.spoken)) return true;
  if (covers(profile.subtitles) || covers(profile.surtitles)) return true;

  return profile.dependency === LanguageDependency.HELPFUL;
}

/**
 * Le spectacle est-il sans barriere pour QUI QUE CE SOIT ?
 *
 * Sert le filtre « sans barriere de langue » de la recherche, qui n'est pas la
 * meme question que `isUnderstandable` : celui-la ne depend d'aucun spectateur.
 */
export function isLanguageNeutral(profile: LanguageProfile): boolean {
  return profile.dependency === LanguageDependency.NONE;
}
