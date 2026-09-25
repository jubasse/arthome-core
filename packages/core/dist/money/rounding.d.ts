/**
 * Rounding happens to the minor unit, on each component separately.
 * ⚠ The sum of the roundings is not the rounding of the sum: three seats at
 * €26.37 give 948 component by component and 949 in one go, one cent per order.
 */
import { type Money } from './money.js';
/**
 * A rate in basis points, as an integer: 1200 = 12%, 550 = 5.5%.
 * ⚠ Never floating point: `2633 * 0.12` returns 315.95999999999998.
 */
export type BasisPoints = number;
export declare const BASIS_POINTS_SCALE = 10000;
export declare function basisPoints(value: number): BasisPoints;
/**
 * Rounds half away from zero, to the minor unit.
 * ⚠ Not `Math.round`, asymmetric on negatives: a €2.505 refund and a €2.505
 * payment must give the same cent up to sign, or a round trip misses zero.
 */
export declare function roundMinor(value: number): number;
/** Applies a rate to an amount and rounds — the one place a rate meets a rounding. */
export declare function applyRate(value: Money, rate: BasisPoints): Money;
/**
 * What remains after applying a rate — exactly `x - applyRate(x, r)`.
 * ⚠ Never `applyRate(x, 10000 - r)`: the two differ by a cent once the rounding
 * lands on a half.
 */
export declare function remainderAfterRate(value: Money, rate: BasisPoints): Money;
/**
 * Extracts the tax portion from a tax-inclusive amount.
 * ⚠ `gross x rate / (10000 + rate)`, not `/ 10000` — the classic error
 * overstates the tax by 5% on a 5.5% rate.
 */
export declare function taxIncludedIn(grossTtc: Money, rate: BasisPoints): Money;
//# sourceMappingURL=rounding.d.ts.map