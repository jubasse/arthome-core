/**
 * ROUNDING — the most-quoted invariant in the project, and the one that goes
 * wrong most quietly.
 *
 * `shared/` carries it and it has authority: "rounding happens TO THE MINOR
 * UNIT, on EACH COMPONENT TAKEN SEPARATELY". This is not a presentation detail:
 *
 *   the sum of the roundings is not the rounding of the sum.
 *
 * Three seats at €26.33: 3 x round(2633 x 0.12) = 3 x 316 = 948, while
 * round(3 x 2633 x 0.12) = round(947.88) = 948 — here they agree. At €26.37:
 * 3 x round(2637 x 0.12) = 3 x 316 = 948, against round(949.32) = 949. One
 * cent, on every order, always in the platform's favour. That is exactly the
 * kind of gap a Stripe reconciliation surfaces six months later with nobody
 * able to say where it came from.
 */

import { DomainError } from '../kernel/errors.js';
import { money, type Money } from './money.js';

/**
 * Rates travel in BASIS POINTS, as integers: 1200 = 12%, 550 = 5.5%.
 *
 * Never in floating point. `0.12` looks innocent until `2633 * 0.12` returns
 * 315.95999999999998 and a rounding tips the wrong way. A rate is exact data:
 * it is carried as an integer.
 */
export type BasisPoints = number;

export const BASIS_POINTS_SCALE = 10_000;

export function basisPoints(value: number): BasisPoints {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new DomainError({ code: 'rate.invalid', params: { rate: String(value) } });
  }
  return value;
}

/**
 * Round half away from zero, to the minor unit.
 *
 * Why not `Math.round`: it rounds -0.5 towards 0 and 0.5 towards 1, so it is
 * ASYMMETRIC on negatives — and negatives exist here, they are refunds and
 * credit notes. A €2.505 refund and a €2.505 payment must produce the same
 * cent, up to sign, or a round trip does not return to zero.
 */
export function roundMinor(value: number): number {
  const rounded = value < 0 ? -Math.round(-value) : Math.round(value);
  if (!Number.isSafeInteger(rounded)) {
    throw new DomainError({ code: 'money.amount_not_integer', params: { amount: String(value) } });
  }
  return rounded;
}

/**
 * Applies a rate to an amount and rounds — THE elementary component.
 *
 * Every rule that applies a rate goes through here: commission, VAT, discount,
 * pro rata. That is what guarantees rounding happens once, in one place, in one
 * direction.
 */
export function applyRate(value: Money, rate: BasisPoints): Money {
  return money(roundMinor((value.amountMinor * rate) / BASIS_POINTS_SCALE), value.currencyCode);
}

/**
 * The complement: what remains after applying a rate.
 *
 * `remainderAfterRate(x, r)` is EXACTLY `x - applyRate(x, r)`, never
 * `applyRate(x, 10000 - r)` — the two differ by a cent as soon as the rounding
 * lands on a half, and that is the difference between a correct net and a net
 * that drifts.
 */
export function remainderAfterRate(value: Money, rate: BasisPoints): Money {
  return money(value.amountMinor - applyRate(value, rate).amountMinor, value.currencyCode);
}

/**
 * Extracts the tax portion from a gross (tax-inclusive) amount.
 *
 * A price shown to a consumer is tax-inclusive (B2C convention): VAT is
 * EXTRACTED from it, not added to it. `gross x rate / (10000 + rate)`, and not
 * `gross x rate / 10000` — the classic error, which overstates the tax by
 * `rate/(10000+rate)`, a 5% error on a 5.5% rate.
 */
export function taxIncludedIn(grossTtc: Money, rate: BasisPoints): Money {
  return money(
    roundMinor((grossTtc.amountMinor * rate) / (BASIS_POINTS_SCALE + rate)),
    grossTtc.currencyCode,
  );
}
