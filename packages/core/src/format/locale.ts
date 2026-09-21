/**
 * La locale est un ARGUMENT, jamais un global.
 *
 * `helpers.js` porte `let locale` au niveau du module, avec `setLocale()`.
 * Dans une maquette, c'est commode. Dans un paquet importe par sept services,
 * deux requetes concurrentes partageraient la meme langue — un spectateur
 * francais recevrait la reponse formatee pour un anglophone parce qu'une autre
 * requete a change le global entre-temps.
 */

import { DomainError } from '../kernel/errors.js';

/** Les deux langues du produit. BCP 47, forme courte. */
export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const Locale = {
  FR: 'fr',
  EN: 'en',
} as const;

export function parseLocale(raw: string): Locale {
  const head = raw.toLowerCase().split('-')[0] ?? '';
  return (LOCALES as readonly string[]).includes(head) ? (head as Locale) : Locale.FR;
}

/**
 * Le choix d'un contenu bilingue : la langue du LECTEUR quand elle existe,
 * l'autre sinon.
 *
 * C'est la regle `content()` de `helpers.js`, portee telle quelle — elle est
 * juste. Le point qu'elle ne dit pas et que le contrat ajoute : la langue de
 * JEU d'un spectacle se dit ailleurs (`spokenLanguages`), elle n'a rien a voir
 * avec la langue d'affichage.
 */
export interface Bilingual {
  readonly fr: string;
  readonly en: string;
}

export function pickLanguage(value: Bilingual, locale: Locale): string {
  const preferred = locale === Locale.FR ? value.fr : value.en;
  const fallback = locale === Locale.FR ? value.en : value.fr;
  const chosen = preferred.length > 0 ? preferred : fallback;
  if (chosen.length === 0) {
    throw new DomainError({ code: 'content.empty_in_both_languages' });
  }
  return chosen;
}
