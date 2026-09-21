/**
 * The price paid is not the tier's price.
 *
 * `storefront-web` (shape 5): the summary carries
 * `tier + service fee − subscription discount − promotion = total`, and **all
 * four lines must come from the contract**. That is exactly the "an order total
 * composed in two places" case the file cites as a typical defect.
 */

import { DomainError } from '../kernel/errors.js';
import type { Instant } from '../kernel/clock.js';
import { isBefore } from '../time/instant.js';
import { add, money, subtract, type Money } from '../money/money.js';
import { applyRate, roundMinor, type BasisPoints } from '../money/rounding.js';
import { PriceTier, PromotionReason } from '../vocabulary/commerce.js';

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
 * The "show already started" price, PRO RATA of the time remaining.
 *
 * `storefront-web`: "it is a value that depends on the instant of reading: it
 * must come from the contract with its validity date, or be recomputable by
 * `@arthome/core` from served parameters. It cannot be a frozen string."
 *
 * Hence this function: the server serves the parameters, the surface
 * re-evaluates when `validUntil` passes. One rule, two calls.
 */
export function lateRatePrice(fullPrice: Money, progress: number): Money {
  const remaining = Math.min(1, Math.max(0, 1 - progress));
  return money(roundMinor(fullPrice.amountMinor * remaining), fullPrice.currencyCode);
}

/**
 * THE DISCOUNT AND THE PROMOTION DO NOT STACK: the one most favourable to the
 * viewer applies (D-017).
 *
 * It is the simplest rule to explain, and the only one that does not produce a
 * negative price on a preview at a discovery rate for a `premium` subscriber.
 * `storefront-web` Q12 asked the question: without it, three screens would
 * write it three times.
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
      code: 'money.currency_mismatch',
      params: { left: basePrice.currencyCode, right: promotionPrice.currencyCode },
    });
  }
  return promotionPrice.amountMinor <= discounted.amountMinor ? promotionPrice : discounted;
}

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
      code: 'order.quantity_invalid',
      params: { quantity: String(quantity) },
    });
  }
  const unitAfterDiscount = applyBestDiscount(unitPrice, subscriptionDiscountBps, promotionPrice);
  // The rounding has already happened on the UNIT price: the multiplication
  // that follows is exact. That is the order imposed by "rounding on each
  // component taken separately" — the reverse produces a cent of drift per
  // order.
  const tierTotal = money(unitPrice.amountMinor * quantity, unitPrice.currencyCode);
  const discountedTotal = money(unitAfterDiscount.amountMinor * quantity, unitPrice.currencyCode);
  const discount = subtract(tierTotal, discountedTotal);
  const serviceFee = serviceFeeFor(feeSchedule, unitAfterDiscount, quantity);
  return { tierTotal, serviceFee, discount, total: add(discountedTotal, serviceFee) };
}
