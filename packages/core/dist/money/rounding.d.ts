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
import { type Money } from './money.js';
/**
 * Rates travel in BASIS POINTS, as integers: 1200 = 12%, 550 = 5.5%.
 *
 * Never in floating point. `0.12` looks innocent until `2633 * 0.12` returns
 * 315.95999999999998 and a rounding tips the wrong way. A rate is exact data:
 * it is carried as an integer.
 */
export type BasisPoints = number;
export declare const BASIS_POINTS_SCALE = 10000;
export declare function basisPoints(value: number): BasisPoints;
/**
 * Round half away from zero, to the minor unit.
 *
 * Why not `Math.round`: it rounds -0.5 towards 0 and 0.5 towards 1, so it is
 * ASYMMETRIC on negatives — and negatives exist here, they are refunds and
 * credit notes. A €2.505 refund and a €2.505 payment must produce the same
 * cent, up to sign, or a round trip does not return to zero.
 */
export declare function roundMinor(value: number): number;
/**
 * Applies a rate to an amount and rounds — THE elementary component.
 *
 * Every rule that applies a rate goes through here: commission, VAT, discount,
 * pro rata. That is what guarantees rounding happens once, in one place, in one
 * direction.
 */
export declare function applyRate(value: Money, rate: BasisPoints): Money;
/**
 * The complement: what remains after applying a rate.
 *
 * `remainderAfterRate(x, r)` is EXACTLY `x - applyRate(x, r)`, never
 * `applyRate(x, 10000 - r)` — the two differ by a cent as soon as the rounding
 * lands on a half, and that is the difference between a correct net and a net
 * that drifts.
 */
export declare function remainderAfterRate(value: Money, rate: BasisPoints): Money;
/**
 * Extracts the tax portion from a gross (tax-inclusive) amount.
 *
 * A price shown to a consumer is tax-inclusive (B2C convention): VAT is
 * EXTRACTED from it, not added to it. `gross x rate / (10000 + rate)`, and not
 * `gross x rate / 10000` — the classic error, which overstates the tax by
 * `rate/(10000+rate)`, a 5% error on a 5.5% rate.
 */
export declare function taxIncludedIn(grossTtc: Money, rate: BasisPoints): Money;
//# sourceMappingURL=rounding.d.ts.map