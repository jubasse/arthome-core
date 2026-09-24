/**
 * Formatting numbers and amounts, WITHOUT `Intl`.
 *
 * An observation made by `storefront-mobile` and confirmed on reading:
 * `helpers.js` formats entirely by hand — `price`, `number`, `compact`,
 * `clock`, `dayLabel`, `longDate`, `duration`, `timecode`, with day and month
 * names hard-coded in both languages. That is exactly what is needed: React
 * Native's JavaScript engine does not offer a complete `Intl` implementation
 * everywhere, and the polyfill costs several hundred kilobytes — in five
 * applications.
 *
 * ⚠ Formatting is PRESENTATION: it decides nothing. It lives here because a
 * value shown identically on five surfaces cannot be formatted by five
 * implementations.
 */
import { Locale } from './locale.js';
import type { Money } from '../money/money.js';
/** "20 732", with the narrow no-break space in French. */
export declare function formatInteger(value: number, locale: Locale): string;
/**
 * "12,4 k", "1,2 M" — the audience counter and the subscriber count.
 *
 * Threshold at a thousand: below it, the exact number is more informative and
 * fits the same width.
 */
export declare function formatCompact(value: number, locale: Locale): string;
export declare function formatMoney(value: Money, locale: Locale): string;
//# sourceMappingURL=number.d.ts.map