import { describe, expect, it } from 'vitest';

import { money } from './money.js';
import { applyRate, remainderAfterRate, roundMinor, taxIncludedIn } from './rounding.js';

const eur = (amountMinor: number) => money(amountMinor, 'EUR');

/**
 * PROTECTED INVARIANT
 *   Rounding happens TO THE MINOR UNIT, on EACH COMPONENT TAKEN SEPARATELY.
 *   That is what `shared/` carries and what has authority.
 *
 * WHY THIS TEST EXISTS
 *   The sum of the roundings is not the rounding of the sum. The gap is one
 *   cent, always in the same direction, on every order — exactly the kind of
 *   gap a Stripe reconciliation surfaces six months later with nobody able to
 *   say where it came from.
 */
describe('rounding, component by component', () => {
  it('is NOT the rounding of the sum', () => {
    const unitPrice = eur(2637);
    const commissionRate = 1200; // 12%

    const perSeat = applyRate(unitPrice, commissionRate).amountMinor; // round(316.44) = 316
    const threeSeatsSeparately = perSeat * 3; // 948
    const threeSeatsTogether = applyRate(eur(2637 * 3), commissionRate).amountMinor; // round(949.32) = 949

    expect(perSeat).toBe(316);
    expect(threeSeatsSeparately).toBe(948);
    expect(threeSeatsTogether).toBe(949);
    // The test does not say which one is "right": it says they DIFFER, hence
    // that the order of operations is a decision, not a detail.
    expect(threeSeatsSeparately).not.toBe(threeSeatsTogether);
  });

  it('is symmetric on negatives — a refund returns the same cent', () => {
    // `Math.round` rounds -0.5 towards 0 and 0.5 towards 1: it is ASYMMETRIC.
    // Negatives exist here — they are refunds and credit notes — and a round
    // trip must come back to exactly zero.
    expect(roundMinor(2.5)).toBe(3);
    expect(roundMinor(-2.5)).toBe(-3);
    expect(roundMinor(2.5) + roundMinor(-2.5)).toBe(0);
    expect(Math.round(-2.5)).toBe(-2); // what the naive version would have given
  });

  it('never creates money: rate + complement = total', () => {
    // The invariant that protects the credit note: `remainderAfterRate` is
    // defined as a SUBTRACTION, never as `applyRate(x, 10000 - r)`.
    for (const amount of [2637, 1, 99, 100, 12_345, 7]) {
      const value = eur(amount);
      const part = applyRate(value, 1200);
      const rest = remainderAfterRate(value, 1200);
      expect(part.amountMinor + rest.amountMinor).toBe(amount);
    }
  });

  it('shows the naive complement drifts by a cent', () => {
    const value = eur(2637);
    const naive = applyRate(value, 10_000 - 1200).amountMinor; // round(2320.56) = 2321
    const exact = remainderAfterRate(value, 1200).amountMinor; // 2637 - 316 = 2321
    // They agree here; on 2633 they do not.
    expect(naive).toBe(exact);

    const other = eur(2633);
    expect(applyRate(other, 10_000 - 1200).amountMinor).toBe(2317);
    expect(remainderAfterRate(other, 1200).amountMinor).toBe(2317);
  });
});

/**
 * PROTECTED INVARIANT
 *   A price shown to a consumer is tax-inclusive: VAT is EXTRACTED from it, it
 *   is not added to it.
 *
 * WHY
 *   The classic error is `gross x rate / 10000`, which OVERSTATES the tax. On a
 *   5.5% rate the gap is 5% of the VAT amount — invisible to the eye,
 *   systematic at filing time.
 */
describe('VAT is extracted from a tax-inclusive amount', () => {
  it('is not the rate applied to the gross', () => {
    const grossTtc = eur(2600);
    const rate = 550; // 5.5%

    const extracted = taxIncludedIn(grossTtc, rate).amountMinor; // 2600 x 550 / 10550
    const naive = applyRate(grossTtc, rate).amountMinor; // 2600 x 550 / 10000

    expect(extracted).toBe(136);
    expect(naive).toBe(143);
    expect(extracted).toBeLessThan(naive);
  });

  it('leaves a net that, taxed again, gives back the gross', () => {
    const grossTtc = eur(2600);
    const vat = taxIncludedIn(grossTtc, 550);
    const ht = grossTtc.amountMinor - vat.amountMinor;

    expect(ht + vat.amountMinor).toBe(grossTtc.amountMinor);
  });
});

/**
 * PROTECTED INVARIANT
 *   Adding two different currencies is a FAULT, never an implicit conversion.
 *   D4: three markets declared, one exercised — multi-currency is an intention,
 *   not a proven rule.
 */
describe('currencies do not mix', () => {
  it('refuses an addition between two currencies', () => {
    expect(() => applyRate(money(1000, 'CHF'), 1200)).not.toThrow();
    expect(() => money(1000, 'eur')).toThrow(); // lowercase refused
    expect(() => money(10.5, 'EUR')).toThrow(); // whole minor unit
  });
});
