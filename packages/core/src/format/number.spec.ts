import { describe, expect, it } from 'vitest';

import { Locale } from './locale.js';
import { formatCompact, formatInteger, formatMoney } from './number.js';
import { money } from '../money/money.js';

/**
 * The contract transports a CURRENCY CODE, never a symbol nor a position: five symbol tables would
 * put the symbol on the wrong side at least once.
 */
describe('formatting amounts', () => {
  it('places the symbol by language, not by currency', () => {
    const price = money(2650, 'EUR');
    expect(formatMoney(price, Locale.FR)).toBe('26,50 €');
    expect(formatMoney(price, Locale.EN)).toBe('€26.50');
  });

  it('omits the cents when they are zero', () => {
    expect(formatMoney(money(2600, 'EUR'), Locale.FR)).toBe('26 €');
  });

  it('returns the CODE for an unknown currency, never a guessed symbol', () => {
    // "26,00 XPF" is correct; "26,00 ¤" is a polite lie.
    expect(formatMoney(money(2600, 'XPF'), Locale.FR)).toBe('26 XPF');
  });

  it('carries a negative amount correctly — refund and credit note', () => {
    expect(formatMoney(money(-2650, 'EUR'), Locale.FR)).toBe('-26,50 €');
  });

  it('groups thousands with a no-break space in French', () => {
    expect(formatInteger(20732, Locale.FR)).toBe('20 732');
    expect(formatInteger(20732, Locale.EN)).toBe('20,732');
  });
});

/** Below a thousand the exact number is more informative and fits the same width. */
describe('the compact counter', () => {
  it('stays exact below a thousand', () => {
    expect(formatCompact(860, Locale.FR)).toBe('860');
  });

  it('abbreviates above it', () => {
    expect(formatCompact(12_400, Locale.FR)).toBe('12,4 k');
    expect(formatCompact(12_400, Locale.EN)).toBe('12.4 k');
    expect(formatCompact(1_200_000, Locale.FR)).toBe('1,2 M');
  });

  it('omits the decimal when it is zero', () => {
    expect(formatCompact(12_000, Locale.FR)).toBe('12 k');
  });
});
