/**
 * Formatting numbers and amounts, WITHOUT `Intl`: React Native's engine has no complete
 * implementation everywhere, and the polyfill costs several hundred kilobytes in five applications.
 */

import { Locale } from './locale.js';
import type { Money } from '../money/money.js';

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

/** "12,4 k", "1,2 M" — the audience counter and the subscriber count; exact below a thousand. */
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

// The contract transports an ISO code, never a symbol nor a position: five surfaces would invent
// five tables, and one would put the symbol on the wrong side.
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
  return locale === Locale.FR ? `${signed}${NO_BREAK_SPACE}${symbol}` : `${symbol}${signed}`;
}
