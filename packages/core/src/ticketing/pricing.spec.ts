import { describe, expect, it } from 'vitest';

import {
  applyBestDiscount,
  lateRatePrice,
  lowestActivePrice,
  quoteSeats,
  type TierPrice,
} from './pricing.js';
import { money } from '../money/money.js';
import { PriceTier, PromotionReason } from '../vocabulary/commerce.js';

const eur = (amountMinor: number) => money(amountMinor, 'EUR');
const fee = { perSeat: eur(150), rateBps: 0 };

/**
 * PROTECTED INVARIANT
 *   The subscription discount and the promotion DO NOT STACK: the one most
 *   favourable to the viewer applies.
 *
 * WHY THIS TEST EXISTS
 *   `storefront-web` Q12: three screens display a discounted price. If the
 *   stacking rule is not in the domain, it will be written three times. And
 *   stacking would produce a NEGATIVE PRICE on a preview at a discovery rate
 *   for a `premium` subscriber — that is the case that settles it.
 */
describe('discount and promotion', () => {
  it('keeps the promotion when it is more favourable', () => {
    // €26 discounted 20% = €20.80; the promotion is at €15.
    expect(applyBestDiscount(eur(2600), 2000, eur(1500)).amountMinor).toBe(1500);
  });

  it('keeps the discount when it is the one that wins', () => {
    // €26 discounted 20% = €20.80; the promotion is at €24.
    expect(applyBestDiscount(eur(2600), 2000, eur(2400)).amountMinor).toBe(2080);
  });

  it('never STACKS — the case that would give a negative price', () => {
    // A preview at a discovery rate (€5) for a premium subscriber (20%).
    // Stacking would give 5 − 5.20 = −€0.20.
    const result = applyBestDiscount(eur(2600), 2000, eur(500));
    expect(result.amountMinor).toBe(500);
    expect(result.amountMinor).toBeGreaterThan(0);
  });

  it('refuses to compare two currencies rather than converting in silence', () => {
    expect(() => applyBestDiscount(eur(2600), 2000, money(1500, 'CHF'))).toThrow();
  });
});

/**
 * PROTECTED INVARIANT
 *   The rounding happens on the UNIT price; the multiplication that follows is
 *   exact.
 *
 * WHY
 *   This is "rounding on each component taken separately" applied to a case
 *   where it is not obvious to the eye. Discounting the total then rounding
 *   produces a cent of drift per order, always in the same direction.
 */
describe('the summary, line by line', () => {
  it('carries the four lines, and they close', () => {
    const quote = quoteSeats(eur(2600), 3, 1000, null, fee);
    expect(quote.tierTotal.amountMinor).toBe(7800);
    expect(quote.discount.amountMinor).toBe(780); // 260 x 3, rounded to the unit
    expect(quote.serviceFee.amountMinor).toBe(450); // 150 x 3
    expect(quote.total.amountMinor).toBe(7800 - 780 + 450);
  });

  it('rounds the unit price, not the total', () => {
    // €26.37 discounted 12%: the discounted unit is 2637 − round(316.44) = 2321.
    // Three seats: 6963. Discounting the TOTAL would give 7911 − round(949.32) = 6962.
    const quote = quoteSeats(eur(2637), 3, 1200, null, fee);
    expect(quote.tierTotal.amountMinor - quote.discount.amountMinor).toBe(6963);
  });

  it('refuses an absurd quantity', () => {
    expect(() => quoteSeats(eur(2600), 0, 0, null, fee)).toThrow();
  });
});

/**
 * PROTECTED INVARIANT
 *   The "show already started" price depends on the INSTANT, so it is
 *   recomputed — it is never a frozen string.
 */
describe('the pro-rata price', () => {
  it("decreases with the live show's progress", () => {
    expect(lateRatePrice(eur(2600), 0).amountMinor).toBe(2600);
    expect(lateRatePrice(eur(2600), 0.5).amountMinor).toBe(1300);
    expect(lateRatePrice(eur(2600), 1).amountMinor).toBe(0);
  });

  it('clamps the progress rather than returning a negative price', () => {
    expect(lateRatePrice(eur(2600), 1.4).amountMinor).toBe(0);
    expect(lateRatePrice(eur(2600), -0.2).amountMinor).toBe(2600);
  });
});

describe('the headline price', () => {
  it('ignores inactive tiers', () => {
    const tiers: readonly TierPrice[] = [
      { tier: PriceTier.FULL, amount: eur(2600), active: true },
      { tier: PriceTier.REDUCED, amount: eur(1800), active: false },
      { tier: PriceTier.SUPPORT, amount: eur(4500), active: true },
    ];
    expect(lowestActivePrice(tiers)?.amountMinor).toBe(2600);
  });

  it('returns null when no tier is active — never zero', () => {
    // A headline price of zero would read as "free". No price and a zero price
    // are not the same thing.
    expect(lowestActivePrice([])).toBeNull();
  });
});

describe('the promotion reasons', () => {
  it('carries the five reasons found in the design', () => {
    expect(Object.values(PromotionReason)).toHaveLength(5);
  });
});
