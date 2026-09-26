/** Capacity, tiers, and the HOLD that stops capacity lying. */

import type { Instant } from '../kernel/clock.js';
import { DomainError } from '../kernel/errors.js';
import { isAfter, plusMinutes } from '../time/instant.js';
import { DomainErrorCode } from '../vocabulary/error-codes.js';

/**
 * The capacity state, as a DISCRIMINATED UNION. A label — "86 seats", "Sold
 * out" — cannot be filtered or sorted, and leaks i18n into the domain.
 */
export type SeatAvailability =
  | { readonly kind: 'seats_available'; readonly seatsAvailable: number }
  | { readonly kind: 'waitlist_only'; readonly waitlistCount: number }
  | { readonly kind: 'sold_out' };

export interface Gauge {
  readonly capacityTotal: number;
  readonly seatsSold: number;
  readonly seatsHeld: number;
  readonly waitlistCount: number;
}

/** The seats ACTUALLY available: net of holds in progress. */
export function seatsAvailable(gauge: Gauge): number {
  return Math.max(0, gauge.capacityTotal - gauge.seatsSold - gauge.seatsHeld);
}

export function availabilityOf(gauge: Gauge): SeatAvailability {
  const available = seatsAvailable(gauge);
  if (available > 0) return { kind: 'seats_available', seatsAvailable: available };
  if (gauge.waitlistCount > 0) return { kind: 'waitlist_only', waitlistCount: gauge.waitlistCount };
  return { kind: 'sold_out' };
}

/**
 * The fill RATE, in basis points — and not the capacity. Serving the capacity
 * and recomputing the rate per surface composes one value twice; the mockup
 * proved it with a constant 2,000 seats independent of the venue.
 */
export function fillRateBps(gauge: Gauge): number {
  if (gauge.capacityTotal <= 0) return 0;
  return Math.round((gauge.seatsSold / gauge.capacityTotal) * 10_000);
}

/**
 * "Almost full" — and the THRESHOLD is a domain rule, not an interface literal.
 * 8,500 bps is 85 %, the same number as the "almost full" notification: a card
 * that says it and an alert that never fires would be incomprehensible.
 */
export const SCARCITY_THRESHOLD_BPS = 8_500;

export function isScarce(gauge: Gauge): boolean {
  return fillRateBps(gauge) >= SCARCITY_THRESHOLD_BPS && seatsAvailable(gauge) > 0;
}

/**
 * THE CAPACITY HOLD, and its SINGLE-INSTANT invariant.
 *
 * A hold expires at the SAME INSTANT as the intent that created it — never
 * two durations that drift — and is placed when the intent OPENS, not at its
 * approval: the TV shows the code, so capacity must be true from then.
 */
export const HOLD_MINUTES_CHECKOUT = 15;
export const HOLD_MINUTES_TV_PAIRING = 5;

export interface SeatHold {
  readonly quantity: number;
  readonly expiresAt: Instant;
}

/** Places a hold whose expiry IS the intent's. */
export function holdFor(quantity: number, intentExpiresAt: Instant): SeatHold {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new DomainError({
      code: DomainErrorCode.HOLD_QUANTITY_INVALID,
      params: { quantity: String(quantity) },
    });
  }
  return { quantity, expiresAt: intentExpiresAt };
}

/** The intent duration for a direct checkout journey. */
export function checkoutIntentExpiry(openedAt: Instant): Instant {
  return plusMinutes(openedAt, HOLD_MINUTES_CHECKOUT);
}

/** The intent duration for a TV pairing — five minutes, not fifteen. */
export function tvPairingIntentExpiry(openedAt: Instant): Instant {
  return plusMinutes(openedAt, HOLD_MINUTES_TV_PAIRING);
}

export function isHoldExpired(hold: SeatHold, now: Instant): boolean {
  return !isAfter(hold.expiresAt, now);
}

/**
 * Capacity tiers: they WIDEN, never shrink after going on sale. Shrinking then
 * would cancel seats already sold.
 */
export function assertTierWidens(currentCapacity: number, nextCapacity: number): void {
  if (nextCapacity <= currentCapacity) {
    throw new DomainError({
      code: DomainErrorCode.CAPACITY_TIER_MUST_WIDEN,
      params: { current: String(currentCapacity), next: String(nextCapacity) },
    });
  }
}

/**
 * The TECHNICAL PROVISIONING threshold and its parameters — CONTRACT DATA, not
 * constants copied onto five surfaces. A forecast far above the real figure
 * exposes you to a penalty, and is revisable up to 72 h before.
 */
export const TECHNICAL_PROVISION_THRESHOLD = 10_000;
export const PROVISION_REVISION_HOURS = 72;

export function requiresTechnicalProvision(capacityTotal: number): boolean {
  return capacityTotal > TECHNICAL_PROVISION_THRESHOLD;
}

/**
 * The priority window granted to the waiting list when a tier opens.
 *
 * Opening a tier notifies the list in the SAME transactional command; two
 * calls let the public take the seats before the list hears of it.
 */
export const WAITLIST_PRIORITY_HOURS = 2;
