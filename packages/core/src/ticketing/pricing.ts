/** The price paid is not the tier's price: all four summary lines come from the contract. */

import type { Instant } from '../kernel/clock.js';
import { DomainError } from '../kernel/errors.js';
import { add, money, subtract, type Money } from '../money/money.js';
import { applyRate, roundMinor, type BasisPoints } from '../money/rounding.js';
import { isBefore } from '../time/instant.js';
import type { PriceTier, PromotionReason } from '../vocabulary/commerce.js';
import { DomainErrorCode, DomainGuardCode } from '../vocabulary/error-codes.js';

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
export function lowestActivePrice(tiers: readonly TierPrice[]): Money | null {
  const active = tiers.filter((tier) => tier.active);
  return active.reduce<Money | null>(
    (lowest, tier) =>
      lowest === null || tier.amount.amountMinor < lowest.amountMinor ? tier.amount : lowest,
    null,
  );
}

export function priceOfTier(tiers: readonly TierPrice[], tier: PriceTier): Money | null {
  return tiers.find((entry) => entry.tier === tier && entry.active)?.amount ?? null;
}

export function activePromotion(promotions: readonly Promotion[], now: Instant): Promotion | null {
  return (
    promotions.find(
      (promotion) => !isBefore(now, promotion.validFrom) && isBefore(now, promotion.validUntil),
    ) ?? null
  );
}

/**
 * The "show already started" price, PRO RATA of the time remaining. It depends
 * on the instant of reading, so the server serves the parameters and the
 * surface re-evaluates when `validUntil` passes: one rule, two calls.
 */
export function lateRatePrice(fullPrice: Money, progress: number): Money {
  const remaining = Math.min(1, Math.max(0, 1 - progress));
  return money(roundMinor(fullPrice.amountMinor * remaining), fullPrice.currencyCode);
}

/**
 * THE DISCOUNT AND THE PROMOTION DO NOT STACK: the one most favourable to the
 * viewer applies (D-017). It is the only rule that does not give a negative
 * price on a preview at a discovery rate for a `premium` subscriber.
 */
export function applyBestDiscount(
  basePrice: Money,
  subscriptionDiscountBps: BasisPoints,
  promotionPrice: Money | null,
): Money {
  const discounted = subtract(basePrice, applyRate(basePrice, subscriptionDiscountBps));
  if (promotionPrice === null) return discounted;
  if (promotionPrice.currencyCode !== basePrice.currencyCode) {
    throw new DomainError({
      code: DomainGuardCode.MONEY_CURRENCY_MISMATCH,
      params: { left: basePrice.currencyCode, right: promotionPrice.currencyCode },
    });
  }
  return promotionPrice.amountMinor <= discounted.amountMinor ? promotionPrice : discounted;
}

/** Service fees: PER SEAT, and the schedule is SERVED. Never a screen constant. */
export interface ServiceFeeSchedule {
  readonly perSeat: Money;
  readonly rateBps: BasisPoints;
}

export function serviceFeeFor(
  schedule: ServiceFeeSchedule,
  unitPrice: Money,
  quantity: number,
): Money {
  const perSeat = add(schedule.perSeat, applyRate(unitPrice, schedule.rateBps));
  return money(perSeat.amountMinor * quantity, perSeat.currencyCode);
}

/** The four lines of the summary, composed ONCE. */
export interface OrderQuote {
  readonly tierTotal: Money;
  readonly serviceFee: Money;
  readonly discount: Money;
  readonly total: Money;
}

export function quoteSeats(
  unitPrice: Money,
  quantity: number,
  subscriptionDiscountBps: BasisPoints,
  promotionPrice: Money | null,
  feeSchedule: ServiceFeeSchedule,
): OrderQuote {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new DomainError({
      code: DomainErrorCode.ORDER_QUANTITY_INVALID,
      params: { quantity: String(quantity) },
    });
  }
  const unitAfterDiscount = applyBestDiscount(unitPrice, subscriptionDiscountBps, promotionPrice);
  // The rounding has already happened on the UNIT price, so this multiplication
  // is exact; discounting the total instead drifts a cent per order.
  const tierTotal = money(unitPrice.amountMinor * quantity, unitPrice.currencyCode);
  const discountedTotal = money(unitAfterDiscount.amountMinor * quantity, unitPrice.currencyCode);
  const discount = subtract(tierTotal, discountedTotal);
  const serviceFee = serviceFeeFor(feeSchedule, unitAfterDiscount, quantity);
  return { tierTotal, serviceFee, discount, total: add(discountedTotal, serviceFee) };
}
