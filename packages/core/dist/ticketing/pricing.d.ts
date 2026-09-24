/**
 * The price paid is not the tier's price.
 *
 * `storefront-web` (shape 5): the summary carries
 * `tier + service fee − subscription discount − promotion = total`, and **all
 * four lines must come from the contract**. That is exactly the "an order total
 * composed in two places" case the file cites as a typical defect.
 */
import type { Instant } from '../kernel/clock.js';
import { type Money } from '../money/money.js';
import { type BasisPoints } from '../money/rounding.js';
import type { PriceTier, PromotionReason } from '../vocabulary/commerce.js';
export interface TierPrice {
    readonly tier: PriceTier;
    readonly amount: Money;
    readonly active: boolean;
}
export interface Promotion {
    readonly reason: PromotionReason;
    readonly currentPrice: Money;
    readonly validFrom: Instant;
    readonly validUntil: Instant;
}
/** The headline price: the lowest of the ACTIVE tiers. */
export declare function lowestActivePrice(tiers: readonly TierPrice[]): Money | null;
export declare function priceOfTier(tiers: readonly TierPrice[], tier: PriceTier): Money | null;
export declare function activePromotion(promotions: readonly Promotion[], now: Instant): Promotion | null;
/**
 * The "show already started" price, PRO RATA of the time remaining.
 *
 * `storefront-web`: "it is a value that depends on the instant of reading: it
 * must come from the contract with its validity date, or be recomputable by
 * `@arthome/core` from served parameters. It cannot be a frozen string."
 *
 * Hence this function: the server serves the parameters, the surface
 * re-evaluates when `validUntil` passes. One rule, two calls.
 */
export declare function lateRatePrice(fullPrice: Money, progress: number): Money;
/**
 * THE DISCOUNT AND THE PROMOTION DO NOT STACK: the one most favourable to the
 * viewer applies (D-017).
 *
 * It is the simplest rule to explain, and the only one that does not produce a
 * negative price on a preview at a discovery rate for a `premium` subscriber.
 * `storefront-web` Q12 asked the question: without it, three screens would
 * write it three times.
 */
export declare function applyBestDiscount(basePrice: Money, subscriptionDiscountBps: BasisPoints, promotionPrice: Money | null): Money;
/**
 * Service fees: PER SEAT, and the schedule is SERVED.
 *
 * `storefront-web` Q11. Never a screen constant — the storefront shows a
 * "service fee" line in its summary, and it must be computable only once.
 */
export interface ServiceFeeSchedule {
    readonly perSeat: Money;
    readonly rateBps: BasisPoints;
}
export declare function serviceFeeFor(schedule: ServiceFeeSchedule, unitPrice: Money, quantity: number): Money;
/** The four lines of the summary, composed ONCE. */
export interface OrderQuote {
    readonly tierTotal: Money;
    readonly serviceFee: Money;
    readonly discount: Money;
    readonly total: Money;
}
export declare function quoteSeats(unitPrice: Money, quantity: number, subscriptionDiscountBps: BasisPoints, promotionPrice: Money | null, feeSchedule: ServiceFeeSchedule): OrderQuote;
//# sourceMappingURL=pricing.d.ts.map