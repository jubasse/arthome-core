/** The price paid is not the tier's price: all four summary lines come from the contract. */
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
 * The "show already started" price, PRO RATA of the time remaining. It depends
 * on the instant of reading, so the server serves the parameters and the
 * surface re-evaluates when `validUntil` passes: one rule, two calls.
 */
export declare function lateRatePrice(fullPrice: Money, progress: number): Money;
/**
 * THE DISCOUNT AND THE PROMOTION DO NOT STACK: the one most favourable to the
 * viewer applies (D-017). It is the only rule that does not give a negative
 * price on a preview at a discovery rate for a `premium` subscriber.
 */
export declare function applyBestDiscount(basePrice: Money, subscriptionDiscountBps: BasisPoints, promotionPrice: Money | null): Money;
/** Service fees: PER SEAT, and the schedule is SERVED. Never a screen constant. */
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