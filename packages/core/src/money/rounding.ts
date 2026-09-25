/**
 * Rounding happens to the minor unit, on each component separately.
 * ⚠ The sum of the roundings is not the rounding of the sum: three seats at
 * €26.37 give 948 component by component and 949 in one go, one cent per order.
 */

import { money, type Money } from './money.js';
import { DomainError } from '../kernel/errors.js';
import { DomainGuardCode } from '../vocabulary/error-codes.js';

/**
 * A rate in basis points, as an integer: 1200 = 12%, 550 = 5.5%.
 * ⚠ Never floating point: `2633 * 0.12` returns 315.95999999999998.
 */
export type BasisPoints = number;

export const BASIS_POINTS_SCALE = 10_000;

export function basisPoints(value: number): BasisPoints {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new DomainError({ code: DomainGuardCode.RATE_INVALID, params: { rate: String(value) } });
  }
  return value;
}

/**
 * Rounds half away from zero, to the minor unit.
 * ⚠ Not `Math.round`, asymmetric on negatives: a €2.505 refund and a €2.505
 * payment must give the same cent up to sign, or a round trip misses zero.
 */
export function roundMinor(value: number): number {
  const rounded = value < 0 ? -Math.round(-value) : Math.round(value);
  if (!Number.isSafeInteger(rounded)) {
    throw new DomainError({
      code: DomainGuardCode.MONEY_AMOUNT_NOT_INTEGER,
      params: { amount: String(value) },
    });
  }
  return rounded;
}

/** Applies a rate to an amount and rounds — the one place a rate meets a rounding. */
export function applyRate(value: Money, rate: BasisPoints): Money {
  return money(roundMinor((value.amountMinor * rate) / BASIS_POINTS_SCALE), value.currencyCode);
}

/**
 * What remains after applying a rate — exactly `x - applyRate(x, r)`.
 * ⚠ Never `applyRate(x, 10000 - r)`: the two differ by a cent once the rounding
 * lands on a half.
 */
export function remainderAfterRate(value: Money, rate: BasisPoints): Money {
  return money(value.amountMinor - applyRate(value, rate).amountMinor, value.currencyCode);
}

/**
 * Extracts the tax portion from a tax-inclusive amount.
 * ⚠ `gross x rate / (10000 + rate)`, not `/ 10000` — the classic error
 * overstates the tax by 5% on a 5.5% rate.
 */
export function taxIncludedIn(grossTtc: Money, rate: BasisPoints): Money {
  return money(
    roundMinor((grossTtc.amountMinor * rate) / (BASIS_POINTS_SCALE + rate)),
    grossTtc.currencyCode,
  );
}
