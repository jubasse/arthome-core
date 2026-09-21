/**
 * Le formatage des nombres et des montants, SANS `Intl`.
 *
 * Constat verifie par `storefront-mobile` et confirme a la lecture :
 * `helpers.js` formate entierement a la main — `price`, `number`, `compact`,
 * `clock`, `dayLabel`, `longDate`, `duration`, `timecode`, avec les noms de
 * jours et de mois en dur dans les deux langues. C'est exactement ce qu'il
 * faut : le moteur JavaScript de React Native n'offre pas partout une
 * implementation `Intl` complete, et le polyfill coute plusieurs centaines de
 * kilo-octets — dans cinq applications.
 *
 * ⚠ Le formatage est de la PRESENTATION : il ne decide de rien. Il vit ici
 * parce qu'une valeur affichee a l'identique sur cinq surfaces ne peut pas
 * etre formatee par cinq implementations.
 */

import type { Money } from '../money/money.js';
// `Locale` est a la fois un type et un objet de membres nommes : un seul import
// porte les deux sens du nom.
import { Locale } from './locale.js';

const NARROW_NO_BREAK_SPACE = ' ';
const NO_BREAK_SPACE = ' ';

/** « 20 732 », avec l'espace insecable etroit en francais. */
export function formatInteger(value: number, locale: Locale): string {
  const negative = value < 0;
  const digits = String(Math.abs(Math.trunc(value)));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, locale === Locale.FR ? NARROW_NO_BREAK_SPACE : ',');
  return negative ? `-${grouped}` : grouped;
}

/**
 * « 12,4 k », « 1,2 M » — le compteur d'audience et le nombre d'abonnes.
 *
 * Seuil a mille : en dessous, le nombre exact est plus informatif et tient dans
 * la meme largeur.
 */
export function formatCompact(value: number, locale: Locale): string {
  const abs = Math.abs(value);
  const decimalSeparator = locale === Locale.FR ? ',' : '.';
  if (abs < 1000) return formatInteger(value, locale);
  const [divisor, suffix] = abs < 1_000_000 ? ([1000, 'k'] as const) : ([1_000_000, 'M'] as const);
  const scaled = Math.round((value / divisor) * 10) / 10;
  const text = Number.isInteger(scaled)
    ? String(scaled)
    : String(scaled).replace('.', decimalSeparator);
  return `${text}${NARROW_NO_BREAK_SPACE}${suffix}`;
}

/**
 * Le symbole d'une devise, et sa POSITION.
 *
 * Le contrat ne transporte JAMAIS un symbole ni une position : il transporte un
 * code ISO. La derivation vit ici, une fois — sinon cinq surfaces inventeraient
 * cinq tables, et l'une d'elles mettrait le symbole du mauvais cote.
 *
 * Une devise inconnue rend son CODE, jamais un symbole devine : « 26,00 XPF »
 * est juste, « 26,00 ¤ » est un mensonge poli.
 */
const SYMBOLS: Readonly<Record<string, string>> = { EUR: '€', CHF: 'CHF', CAD: '$', USD: '$', GBP: '£' };

export function formatMoney(value: Money, locale: Locale): string {
  const symbol = SYMBOLS[value.currencyCode] ?? value.currencyCode;
  const negative = value.amountMinor < 0;
  const abs = Math.abs(value.amountMinor);
  const units = Math.trunc(abs / 100);
  const cents = abs % 100;
  const decimalSeparator = locale === Locale.FR ? ',' : '.';
  const body =
    cents === 0
      ? formatInteger(units, locale)
      : `${formatInteger(units, locale)}${decimalSeparator}${String(cents).padStart(2, '0')}`;
  const signed = negative ? `-${body}` : body;
  // Francais : symbole apres, espace insecable. Anglais : symbole avant, colle.
  return locale === Locale.FR ? `${signed}${NO_BREAK_SPACE}${symbol}` : `${symbol}${signed}`;
}
