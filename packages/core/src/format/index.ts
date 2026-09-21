/**
 * Le formatage — SANS `Intl`, avec une locale explicite.
 *
 * Il ne decide de rien. Il vit dans le domaine parce qu'une valeur affichee a
 * l'identique sur cinq surfaces ne peut pas etre formatee par cinq
 * implementations — c'est la meme raison que pour les regles, appliquee a la
 * presentation.
 */

export type { Bilingual } from './locale.js';
// `Locale` porte ses deux sens — le type et les membres nommes.
export { LOCALES, Locale, parseLocale, pickLanguage } from './locale.js';

export { formatCompact, formatInteger, formatMoney } from './number.js';
export {
  formatClock,
  formatCountdown,
  formatDuration,
  formatLongDate,
  formatTimecode,
} from './time.js';
