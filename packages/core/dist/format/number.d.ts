/**
 * Formatting numbers and amounts, WITHOUT `Intl`: React Native's engine has no complete
 * implementation everywhere, and the polyfill costs several hundred kilobytes in five applications.
 */
import { Locale } from './locale.js';
import type { Money } from '../money/money.js';
/** "20 732", with the narrow no-break space in French. */
export declare function formatInteger(value: number, locale: Locale): string;
/** "12,4 k", "1,2 M" — the audience counter and the subscriber count; exact below a thousand. */
export declare function formatCompact(value: number, locale: Locale): string;
export declare function formatMoney(value: Money, locale: Locale): string;
//# sourceMappingURL=number.d.ts.map