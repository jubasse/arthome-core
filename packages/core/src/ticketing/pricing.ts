/**
 * Le prix paye n'est pas le prix du palier.
 *
 * `storefront-web` (forme 5) : le recapitulatif porte
 * `palier + frais de service − remise d'abonnement − promotion = total`, et
 * **les quatre lignes doivent venir du contrat**. C'est exactement le cas
 * « un total de commande compose a deux endroits » que le dossier cite comme
 * defaut typique.
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

/** Le tarif d'appel : le plus bas des paliers ACTIFS. */
export function lowestActivePrice(tiers: readonly TierPrice[]): Money | null {
  const active = tiers.filter((tier) => tier.active);
  return active.reduce<Money | null>(
    (lowest, tier) => (lowest === null || tier.amount.amountMinor < lowest.amountMinor ? tier.amount : lowest),
    null,
  );
}

export function priceOfTier(tiers: readonly TierPrice[], tier: PriceTier): Money | null {
  return tiers.find((entry) => entry.tier === tier && entry.active)?.amount ?? null;
}

export function activePromotion(
  promotions: readonly Promotion[],
  now: Instant,
): Promotion | null {
  return (
    promotions.find(
      (promotion) => !isBefore(now, promotion.validFrom) && isBefore(now, promotion.validUntil),
    ) ?? null
  );
}

/**
 * Le tarif « seance commencee », AU PRORATA du temps restant.
 *
 * `storefront-web` : « c'est une valeur qui depend de l'instant de lecture :
 * elle doit venir du contrat avec sa date de validite, ou etre recalculable par
 * `@arthome/core` a partir de parametres servis. Elle ne peut pas etre une
 * chaine figee. »
 *
 * D'ou cette fonction : le serveur sert les parametres, la surface reevalue
 * quand `validUntil` passe. Une regle, deux appels.
 */
export function lateRatePrice(fullPrice: Money, progress: number): Money {
  const remaining = Math.min(1, Math.max(0, 1 - progress));
  return money(roundMinor(fullPrice.amountMinor * remaining), fullPrice.currencyCode);
}

/**
 * LA REMISE ET LA PROMOTION NE SE CUMULENT PAS : la plus favorable au
 * spectateur s'applique (D-017).
 *
 * C'est la regle la plus simple a expliquer, et la seule qui ne produise pas de
 * prix negatif sur une avant-premiere a tarif de decouverte pour un abonne
 * `premium`. `storefront-web` Q12 la posait : sans elle, trois ecrans
 * l'ecriraient trois fois.
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
 * Les frais de service : PAR PLACE, et le bareme est SERVI.
 *
 * `storefront-web` Q11. Jamais une constante d'ecran — le storefront affiche
 * une ligne « frais de service » dans son recapitulatif, et elle doit etre
 * calculable une seule fois.
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

/** Les quatre lignes du recapitulatif, composees UNE FOIS. */
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
    throw new DomainError({ code: 'order.quantity_invalid', params: { quantity: String(quantity) } });
  }
  const unitAfterDiscount = applyBestDiscount(unitPrice, subscriptionDiscountBps, promotionPrice);
  // L'arrondi a deja eu lieu sur le prix UNITAIRE : la multiplication qui suit
  // est exacte. C'est l'ordre impose par « arrondi sur chaque composante prise
  // separement » — l'inverse produirait un centime d'ecart par commande.
  const tierTotal = money(unitPrice.amountMinor * quantity, unitPrice.currencyCode);
  const discountedTotal = money(unitAfterDiscount.amountMinor * quantity, unitPrice.currencyCode);
  const discount = subtract(tierTotal, discountedTotal);
  const serviceFee = serviceFeeFor(feeSchedule, unitAfterDiscount, quantity);
  return { tierTotal, serviceFee, discount, total: add(discountedTotal, serviceFee) };
}
