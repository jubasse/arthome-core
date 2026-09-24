/**
 * The locale is an ARGUMENT, never a global.
 *
 * `helpers.js` holds `let locale` at module level, with a `setLocale()`. In a
 * mockup that is convenient. In a package imported by seven services, two
 * concurrent requests would share the same language — a French viewer would get
 * the response formatted for an English speaker because another request changed
 * the global in the meantime.
 */

import { DomainError } from '../kernel/errors.js';
import { DomainErrorCode } from '../vocabulary/error-codes.js';

/** The product's two languages. BCP 47, short form. */
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
 * Choosing between bilingual content: the READER's language when it exists, the
 * other one otherwise.
 *
 * This is `helpers.js`'s `content()` rule, ported as it stands — it is right.
 * The point it does not make, and the contract adds: a show's PERFORMED
 * language is stated elsewhere (`spokenLanguages`); it has nothing to do with
 * the display language.
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
    throw new DomainError({ code: DomainErrorCode.CONTENT_EMPTY_IN_BOTH_LANGUAGES });
  }
  return chosen;
}
