/** Capacity, tiers, and the HOLD that stops capacity lying. */

import type { Instant } from '../kernel/clock.js';
import { DomainConstant } from '../kernel/domain-constants.js';
import { DomainError } from '../kernel/errors.js';
import {
  isAfter,
  isBefore,
  minutesBetween,
  plusHours,
  plusMinutes,
  plusSeconds,
} from '../time/instant.js';
import { CatalogErrorCode, DomainErrorCode } from '../vocabulary/error-codes.js';

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

/**
 * How long an admission out of a date's sales queue lets its account buy that date
 * (adr-ticketing.md §4). Unused by then, it lapses and the account queues again.
 */
export const SALES_QUEUE_ADMISSION_SECONDS = 60;

/**
 * At most one `availability_changed` per date in this interval while the date keeps moving.
 * Selling out and coming back from sold out publish at once: they change what surfaces offer.
 */
export const AVAILABILITY_PUBLISH_MIN_INTERVAL_SECONDS = 5;

/**
 * How long a date's availability read holds from its `servedAt`: short, because the "show already
 * started" price it carries is pro rata of the time remaining.
 */
export const AVAILABILITY_VALID_SECONDS = 60;

export function availabilityValidUntil(servedAt: Instant): Instant {
  return plusSeconds(servedAt, AVAILABILITY_VALID_SECONDS);
}

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

/** A seat's cancellation deadline, served as an instant (data-model.md §3.3), never a sentence. */
export function seatCancelDeadline(startsAt: Instant): Instant {
  return plusMinutes(startsAt, -DomainConstant.CANCEL_DEADLINE_MINUTES_BEFORE);
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
 * exposes you to a penalty, and is revisable until `PROVISION_REVISION_HOURS`
 * before the date.
 */
export const TECHNICAL_PROVISION_THRESHOLD = 10_000;
export const PROVISION_REVISION_HOURS = 72;

export function requiresTechnicalProvision(capacityTotal: number): boolean {
  return capacityTotal > TECHNICAL_PROVISION_THRESHOLD;
}

export function provisionRevisableUntil(startsAt: Instant): Instant {
  return plusHours(startsAt, -PROVISION_REVISION_HOURS);
}

/**
 * Refuses a capacity beyond the threshold that no recorded provision covers. `provisionedCapacity`
 * is null while none is recorded; `startsAt` is null while the date has no start, and the refusal
 * then names no deadline.
 */
export function assertTechnicalProvisionCovers(
  capacityTotal: number,
  provisionedCapacity: number | null,
  startsAt: Instant | null,
): void {
  if (!requiresTechnicalProvision(capacityTotal)) return;
  if (provisionedCapacity !== null && provisionedCapacity >= capacityTotal) return;
  throw new DomainError({
    code: CatalogErrorCode.TECHNICAL_PROVISION_REQUIRED,
    params: {
      threshold: TECHNICAL_PROVISION_THRESHOLD,
      capacityTotal,
      ...(provisionedCapacity === null ? {} : { provisionedCapacity }),
      ...(startsAt === null ? {} : { revisableUntil: provisionRevisableUntil(startsAt) }),
    },
  });
}

/**
 * Refuses to record a provision from `provisionRevisableUntil` on, or one below the capacity already
 * open (D-088). A date with no start has no deadline yet.
 */
export function assertTechnicalProvisionRecordable(
  capacityTotal: number,
  provisionedCapacity: number,
  startsAt: Instant | null,
  now: Instant,
): void {
  if (startsAt !== null) {
    const revisableUntil = provisionRevisableUntil(startsAt);
    if (!isBefore(now, revisableUntil)) {
      throw new DomainError({
        code: CatalogErrorCode.PROVISION_DEADLINE_PASSED,
        params: { revisableUntil },
      });
    }
  }
  if (provisionedCapacity < capacityTotal) {
    throw new DomainError({
      code: CatalogErrorCode.PROVISION_BELOW_CAPACITY,
      params: { capacityTotal, provisionedCapacity },
    });
  }
}

/**
 * The priority window granted to the waiting list when a tier opens.
 *
 * Opening a tier notifies the list in the SAME transactional command; two
 * calls let the public take the seats before the list hears of it.
 */
export const WAITLIST_PRIORITY_HOURS = 2;

/** One `waitlist.notified` names at most this many accounts; a tier opening writes as many as it needs. */
export const WAITLIST_NOTIFIED_ACCOUNTS_MAX = 500;

/** adr-ticketing.md §6: how many expired holds one pass of the sweeper's one-second loop takes. */
export const HOLD_EXPIRY_BATCH = 500;

/** D-089: a seat covers the live alone, sold until this long after its start, every channel alike. */
export const SEAT_SALES_CUTOFF_MINUTES_AFTER_START = 30;

export function seatSalesEndAt(startsAt: Instant): Instant {
  return plusMinutes(startsAt, SEAT_SALES_CUTOFF_MINUTES_AFTER_START);
}

/** Past the sale's end by time; a date with no start has no end. */
export function salesEndedBy(salesEndAt: Instant | null, now: Instant): boolean {
  return salesEndAt !== null && !isBefore(now, salesEndAt);
}

/** What a buyer arriving after the start is told, and must acknowledge, before buying (D-089). */
export interface LateEntry {
  readonly startedAt: Instant;
  /** Whole minutes of the live already missed. */
  readonly minutesElapsed: number;
  readonly salesEndAt: Instant;
}

/** Null before the start, and for a date with none. */
export function lateEntryOf(startsAt: Instant | null, now: Instant): LateEntry | null {
  if (startsAt === null || isBefore(now, startsAt)) return null;
  return {
    startedAt: startsAt,
    minutesElapsed: Math.floor(minutesBetween(startsAt, now)),
    salesEndAt: seatSalesEndAt(startsAt),
  };
}
