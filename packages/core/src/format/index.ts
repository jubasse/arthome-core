/**
 * Formatting — WITHOUT `Intl`, with an explicit locale.
 *
 * It decides nothing. It lives in the domain because a value shown identically
 * on five surfaces cannot be formatted by five implementations — the same
 * reason as for the rules, applied to presentation.
 */

export type { Bilingual } from './locale.js';
// `Locale` carries both of its meanings — the type and the named members.
export { LOCALES, Locale, parseLocale, pickLanguage } from './locale.js';

export { formatCompact, formatInteger, formatMoney } from './number.js';
export {
  formatClock,
  formatCountdown,
  formatDuration,
  formatLongDate,
  formatTimecode,
} from './time.js';
