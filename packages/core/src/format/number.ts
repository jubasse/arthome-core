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
// `Locale` is both a type and an object of named members: one import carries
// both meanings of the name.

const NARROW_NO_BREAK_SPACE = ' ';
const NO_BREAK_SPACE = ' ';

/** "20 732", with the narrow no-break space in French. */
export function formatInteger(value: number, locale: Locale): string {
  const negative = value < 0;
  const digits = String(Math.abs(Math.trunc(value)));
  const grouped = digits.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    locale === Locale.FR ? NARROW_NO_BREAK_SPACE : ',',
  );
  return negative ? `-${grouped}` : grouped;
}

/**
 * "12,4 k", "1,2 M" — the audience counter and the subscriber count.
 *
 * Threshold at a thousand: below it, the exact number is more informative and
 * fits the same width.
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
 * A currency's symbol, and its POSITION.
 *
 * The contract NEVER transports a symbol or a position: it transports an ISO
 * code. The derivation lives here, once — otherwise five surfaces would invent
 * five tables, and one of them would put the symbol on the wrong side.
 *
 * An unknown currency returns its CODE, never a guessed symbol: "26,00 XPF" is
 * correct, "26,00 ¤" is a polite lie.
 */
const SYMBOLS: Readonly<Record<string, string>> = {
  EUR: '€',
  CHF: 'CHF',
  CAD: '$',
  USD: '$',
  GBP: '£',
};

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
  // French: symbol after, no-break space. English: symbol before, no space.
  return locale === Locale.FR ? `${signed}${NO_BREAK_SPACE}${symbol}` : `${symbol}${signed}`;
}
